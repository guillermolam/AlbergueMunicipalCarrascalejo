use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Method, Params, Request, Response, ResponseBuilder, Router},
    http_component,
    key_value::Store,
    redis, variables,
};
use std::collections::HashMap;
use uuid::Uuid;

mod jwks_client;
use jwks_client::keyset::KeyStore;

const SERVICE_REGISTRY_STORE: &str = "default";
const CORRELATION_ID_HEADER: &str = "x-correlation-id";
const TRACE_ID_HEADER: &str = "x-trace-id";

#[derive(Debug, Deserialize)]
struct OpenIdConfiguration {
    pub issuer: String,
    pub jwks_uri: String,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ServiceRegistration {
    name: String,
    url: String,
    health_check: String,
    registered_at: String,
}

/// API Gateway - Handles authentication, service discovery, request tracing
/// Features:
/// - OIDC/JWT authentication with Google
/// - Correlation ID for distributed tracing
/// - Service discovery via KV store
/// - Redis caching
/// - Request/response logging
#[http_component]
fn handle_gateway(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::new();

    // Health check
    router.get("/health", handle_health);
    router.get("/api/health", handle_health);

    // Frontend helper endpoints (do not require auth)
    router.get("/api/gateway/camino-languages", handle_camino_languages);

    // Service discovery endpoints
    router.get("/api/services", handle_list_services);
    router.post("/api/services/register", handle_register_service);

    // Protected API routes - require authentication
    router.any("/api/*", handle_protected_route);

    router.handle(req)
}

/// Public endpoint used by the frontend language selector
fn handle_camino_languages(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!([
                { "code": "es", "name": "Español" },
                { "code": "en", "name": "English" },
                { "code": "fr", "name": "Français" },
                { "code": "de", "name": "Deutsch" },
                { "code": "it", "name": "Italiano" },
                { "code": "pt", "name": "Português" },
                { "code": "nl", "name": "Nederlands" },
                { "code": "pl", "name": "Polski" },
                { "code": "ja", "name": "日本語" },
                { "code": "ko", "name": "한국어" },
                { "code": "zh", "name": "中文" },
                { "code": "ru", "name": "Русский" }
            ])
            .to_string(),
        )
        .build())
}

/// Health check endpoint
fn handle_health(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    Ok(Response::new(
        200,
        serde_json::json!({
            "status": "healthy",
            "service": "api-gateway",
            "version": env!("CARGO_PKG_VERSION")
        })
        .to_string(),
    ))
}

/// List all registered services
fn handle_list_services(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    let store = Store::open(SERVICE_REGISTRY_STORE)?;

    // Get all service keys
    let keys = store.get_keys()?;
    let mut services = Vec::new();

    for key in keys {
        if key.starts_with("service:") {
            if let Ok(data) = store.get(&key) {
                if let Ok(service) = serde_json::from_slice::<ServiceRegistration>(&data) {
                    services.push(service);
                }
            }
        }
    }

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&services)?)
        .build())
}

/// Register a new service
fn handle_register_service(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let registration: ServiceRegistration = serde_json::from_slice(req.body())?;

    let store = Store::open(SERVICE_REGISTRY_STORE)?;
    let key = format!("service:{}", registration.name);

    store.set(&key, &serde_json::to_vec(&registration)?)?;

    println!(
        "[API Gateway] Service registered: {} at {}",
        registration.name, registration.url
    );

    Ok(Response::new(201, serde_json::to_string(&registration)?))
}

/// Handle protected routes - requires JWT authentication
async fn handle_protected_route(req: Request, _params: Params) -> Result<Response> {
    // Generate or extract correlation ID
    let correlation_id = req
        .header(CORRELATION_ID_HEADER)
        .and_then(|h| h.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let trace_id = Uuid::new_v4().to_string();

    println!(
        "[{}] [{}] {} {} - Authentication check",
        correlation_id,
        trace_id,
        req.method(),
        req.uri().path()
    );

    // Extract JWT from Authorization header
    let auth_header = req.header("Authorization");
    if auth_header.is_none() {
        println!("[{}] Missing Authorization header", correlation_id);
        return Ok(Response::new(
            401,
            serde_json::json!({
                "error": "Unauthorized",
                "message": "Missing Authorization header",
                "correlation_id": correlation_id
            })
            .to_string(),
        ));
    }

    let jwt = auth_header
        .unwrap()
        .as_str()
        .and_then(|val| {
            let mut parts = val.split_whitespace();
            parts.nth(1)
        })
        .unwrap_or("");

    if jwt.is_empty() {
        println!("[{}] Invalid Authorization format", correlation_id);
        return Ok(Response::new(
            401,
            serde_json::json!({
                "error": "Unauthorized",
                "message": "Invalid Authorization format",
                "correlation_id": correlation_id
            })
            .to_string(),
        ));
    }

    // Validate JWT
    match validate_jwt(jwt, &correlation_id).await {
        Ok(claims) => {
            println!(
                "[{}] Authentication successful for subject: {:?}",
                correlation_id,
                claims.get("sub")
            );

            // Forward to backend service with added headers
            forward_to_service(req, &correlation_id, &trace_id, claims).await
        }
        Err(e) => {
            println!("[{}] Authentication failed: {}", correlation_id, e);
            Ok(Response::new(
                401,
                serde_json::json!({
                    "error": "Unauthorized",
                    "message": format!("JWT validation failed: {}", e),
                    "correlation_id": correlation_id
                })
                .to_string(),
            ))
        }
    }
}

/// Validate JWT token using OIDC/Google
async fn validate_jwt(token: &str, correlation_id: &str) -> Result<HashMap<String, String>> {
    // Get OIDC URL from environment (Google or custom)
    let oidc_url = variables::get("google_oidc_url")
        .unwrap_or_else(|_| String::from("https://accounts.google.com"));

    println!(
        "[{}] Fetching OIDC configuration from {}",
        correlation_id, oidc_url
    );

    // Check Redis cache first
    let cache_key = format!("jwks:{}", oidc_url);
    if let Ok(address) = variables::get("redis_address") {
        match redis::get(&address, &cache_key).await {
            Ok(cached_jwks_uri) => {
                if !cached_jwks_uri.is_empty() {
                    println!("[{}] Using cached JWKS URI", correlation_id);
                    return verify_with_jwks(&cached_jwks_uri, token, correlation_id).await;
                }
            }
            Err(_) => {}
        }
    }

    // Fetch OIDC configuration
    let config_url = format!("{}/.well-known/openid-configuration", oidc_url);
    let req = spin_sdk::http::Request::builder()
        .method(Method::Get)
        .uri(config_url)
        .body(());

    let res: spin_sdk::http::Response = spin_sdk::http::send(req.try_into()?).await?;
    let config: OpenIdConfiguration = serde_json::from_slice(res.body())?;

    println!("[{}] JWKS URI: {}", correlation_id, config.jwks_uri);

    // Cache JWKS URI
    if let Ok(address) = variables::get("redis_address") {
        let _ = redis::set(&address, &cache_key, &config.jwks_uri.as_bytes()).await;
        let _ = redis::execute(&address, "EXPIRE", &[cache_key.as_bytes(), b"3600"]).await;
    }

    verify_with_jwks(&config.jwks_uri, token, correlation_id).await
}

/// Verify JWT with JWKS
async fn verify_with_jwks(
    jwks_uri: &str,
    token: &str,
    correlation_id: &str,
) -> Result<HashMap<String, String>> {
    let key_store = KeyStore::new_from(jwks_uri.to_string())
        .await
        .context("Failed to load JWKS")?;

    let jwt = key_store
        .verify(token)
        .map_err(|e| anyhow::anyhow!("JWT verification failed: {:?}", e))?;

    println!("[{}] JWT verification successful", correlation_id);

    // Extract claims
    let mut claims = HashMap::new();
    if let Some(sub) = jwt.payload().sub() {
        claims.insert("sub".to_string(), sub.to_string());
    }
    if let Some(iss) = jwt.payload().iss() {
        claims.insert("iss".to_string(), iss.to_string());
    }

    Ok(claims)
}

/// Forward request to backend service
async fn forward_to_service(
    mut req: Request,
    correlation_id: &str,
    trace_id: &str,
    claims: HashMap<String, String>,
) -> Result<Response> {
    let path = req.uri().path();

    // Discover service from path
    let service_name = extract_service_name(path);

    println!(
        "[{}] [{}] Routing to service: {}",
        correlation_id, trace_id, service_name
    );

    // Look up service in registry
    let store = Store::open(SERVICE_REGISTRY_STORE)?;
    let service_key = format!("service:{}", service_name);

    let service_url = match store.get(&service_key) {
        Ok(data) => {
            let registration: ServiceRegistration = serde_json::from_slice(&data)?;
            registration.url
        }
        Err(_) => {
            // Fallback to direct routing
            format!("/api/{}/...", service_name)
        }
    };

    println!(
        "[{}] [{}] Forwarding to: {}{}",
        correlation_id, trace_id, service_url, path
    );

    // Add tracing headers
    let mut forward_req = spin_sdk::http::Request::builder()
        .method(req.method().clone())
        .uri(format!("{}{}", service_url, path))
        .body(req.body().clone())?;

    // Copy headers and add correlation/trace IDs
    let headers = forward_req.headers_mut();
    for (name, value) in req.headers() {
        if !name.as_str().starts_with("spin-") && name.as_str() != "host" {
            headers.insert(name, value.clone());
        }
    }
    headers.insert(CORRELATION_ID_HEADER, correlation_id.parse()?);
    headers.insert(TRACE_ID_HEADER, trace_id.parse()?);
    headers.insert("x-user-claims", serde_json::to_string(&claims)?.parse()?);

    // Send request
    match spin_sdk::http::send(forward_req).await {
        Ok(mut response) => {
            // Add correlation ID to response
            response
                .headers_mut()
                .insert(CORRELATION_ID_HEADER, correlation_id.parse()?);

            println!(
                "[{}] [{}] Response: {}",
                correlation_id,
                trace_id,
                response.status()
            );

            Ok(Response::new(
                response.status().as_u16(),
                response.body().clone(),
            ))
        }
        Err(e) => {
            println!(
                "[{}] [{}] Error forwarding: {:?}",
                correlation_id, trace_id, e
            );
            Ok(Response::new(
                502,
                serde_json::json!({
                    "error": "Bad Gateway",
                    "message": "Service unavailable",
                    "service": service_name,
                    "correlation_id": correlation_id
                })
                .to_string(),
            ))
        }
    }
}

/// Extract service name from path
fn extract_service_name(path: &str) -> String {
    let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
    if parts.len() >= 2 && parts[0] == "api" {
        parts[1].to_string()
    } else {
        "unknown".to_string()
    }
}
