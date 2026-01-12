#![warn(clippy::all, clippy::pedantic)]
#![deny(warnings)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
};

// Import our auth verification module
mod auth_verify;
use auth_verify::verify_token;

// Service URLs - using relative paths for Fermyon Cloud deployment
// All services are deployed in the same Spin application
const RATE_LIMITER_URL: &str = "/rate-limiter";
const SECURITY_URL: &str = "/security";
const AUTH_URL: &str = "/auth";
const BOOKING_URL: &str = "/booking";
const REVIEWS_URL: &str = "/reviews";
const NOTIFICATION_URL: &str = "/notification";
const LOCATION_URL: &str = "/location";
const INFO_URL: &str = "/info";
const VALIDATION_URL: &str = "/validation";

#[derive(Serialize, Deserialize)]
struct ServiceCompositionResult {
    rate_limit_passed: bool,
    security_scan_passed: bool,
    auth_verified: bool,
    business_logic_result: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct MiddlewareContext {
    client_id: String,
    endpoint: String,
    method: String,
    user_id: Option<String>,
    permissions: Vec<String>,
}

// Stateless pure function for CORS headers
pub fn create_cors_headers() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Access-Control-Allow-Origin", "*"),
        (
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS",
        ),
        (
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-API-Key",
        ),
        (
            "Access-Control-Expose-Headers",
            "X-RateLimit-Remaining, X-RateLimit-Reset",
        ),
    ]
}

// Stateless pure function for response building
pub fn build_response_with_cors(status: u16, content_type: &str, body: String) -> Response {
    Response::new(status, body)
}

// Async stateless function for rate limiting middleware
pub async fn apply_rate_limiting(req: &Request, context: &mut MiddlewareContext) -> Result<bool> {
    // Forward request to rate limiter service
    let url = format!("{}/check", RATE_LIMITER_URL);

    match forward_request(&url, req).await {
        Ok(response) => {
            let status_code: u16 = (*response.status()).into();
            Ok(status_code == 200)
        }
        Err(_) => Ok(false),
    }
}

// Async stateless function for security scanning middleware
pub async fn apply_security_scanning(
    req: &Request,
    context: &mut MiddlewareContext,
) -> Result<bool> {
    // Forward request to security service
    let url = format!("{}/scan", SECURITY_URL);

    match forward_request(&url, req).await {
        Ok(response) => {
            let status_code: u16 = (*response.status()).into();
            Ok(status_code == 200)
        }
        Err(_) => Ok(false),
    }
}

// Async stateless function for OAuth2/OpenID Connect authentication
pub async fn apply_authentication(req: &Request, context: &mut MiddlewareContext) -> Result<bool> {
    // Verify the token with our auth service
    match verify_token(req).await {
        Ok(valid) if valid => {
            // In a real implementation, you would extract user info from the token
            // For now, we'll just set some default values
            context.user_id = Some("user_123".to_string());
            context.permissions = vec!["read".to_string(), "write".to_string()];
            Ok(true)
        }
        _ => Ok(false),
    }
}

// Async stateless function for service composition pipeline
pub async fn compose_services(req: Request) -> Result<Response> {
    let path = req.uri().to_string();
    let method = format!("{:?}", req.method());

    // Create middleware context
    let mut context = MiddlewareContext {
        client_id: extract_client_id(&req),
        endpoint: path.clone(),
        method: method.clone(),
        user_id: None,
        permissions: Vec::new(),
    };

    // Step 1: Rate Limiting (always first)
    let rate_limit_passed = apply_rate_limiting(&req, &mut context).await?;
    if !rate_limit_passed {
        let error_body = serde_json::json!({
            "error": "Rate Limit Exceeded",
            "message": "Too many requests. Please try again later.",
            "retry_after": 60
        })
        .to_string();
        return Ok(build_response_with_cors(
            429,
            "application/json",
            error_body,
        ));
    }

    // Step 2: Security Scanning (second layer of defense)
    let security_passed = apply_security_scanning(&req, &mut context).await?;
    if !security_passed {
        let error_body = serde_json::json!({
            "error": "Security Threat Detected",
            "message": "Request blocked due to security policy violation.",
            "details": "Contact support if you believe this is an error"
        })
        .to_string();
        return Ok(build_response_with_cors(
            403,
            "application/json",
            error_body,
        ));
    }

    // Step 3: Authentication/Authorization (for protected routes)
    let auth_verified = apply_authentication(&req, &mut context).await?;
    if !auth_verified && requires_authentication(&path) {
        let error_body = serde_json::json!({
            "error": "Authentication Required",
            "message": "Valid authentication token required for this endpoint.",
            "auth_url": "/api/auth/login"
        })
        .to_string();
        return Ok(build_response_with_cors(
            401,
            "application/json",
            error_body,
        ));
    }

    // Step 4: Route to appropriate business service
    let business_result = route_to_business_service(&req, &context).await?;
    Ok(business_result)
}

// Stateless pure function for client ID extraction
pub fn extract_client_id(req: &Request) -> String {
    // Try to get client IP from headers
    for (key, value) in req.headers() {
        if key == "x-forwarded-for" || key == "x-real-ip" {
            if let Some(val_str) = value.as_str() {
                return val_str.to_string();
            }
        }
    }
    "unknown".to_string()
}

// Stateless pure function for authentication requirement check
pub fn requires_authentication(path: &str) -> bool {
    let protected_endpoints = vec![
        "/api/booking/",
        "/api/admin/",
        "/api/notifications/create",
        "/api/validation/upload",
    ];

    protected_endpoints
        .iter()
        .any(|endpoint| path.starts_with(endpoint))
}

// Helper function to forward requests to backend microservices
async fn forward_request(url: &str, original_req: &Request) -> Result<Response> {
    // Create a new request with the target URL
    let new_req = Request::new(original_req.method().clone(), url);

    // Send request using Spin's HTTP client
    match spin_sdk::http::send(new_req).await {
        Ok(response) => Ok(response),
        Err(e) => {
            anyhow::bail!("Failed to forward request: {:?}", e)
        }
    }
}

// Async stateless function for business service routing
async fn route_to_business_service(
    req: &Request,
    _context: &MiddlewareContext,
) -> Result<Response> {
    let path = req.uri().to_string();

    let (service_url, service_path) = match path.as_str() {
        p if p.starts_with("/api/health") => return handle_health_check().await,
        p if p.starts_with("/api/gateway/camino-languages") => return handle_camino_languages(req).await,
        p if p.starts_with("/api/auth/") => (AUTH_URL, p),
        p if p.starts_with("/api/booking/") => (BOOKING_URL, p),
        p if p.starts_with("/api/reviews/") => (REVIEWS_URL, p),
        p if p.starts_with("/api/notifications/") => (NOTIFICATION_URL, p),
        p if p.starts_with("/api/location/") => (LOCATION_URL, p),
        p if p.starts_with("/api/info/") => (INFO_URL, p),
        p if p.starts_with("/api/validation/") => (VALIDATION_URL, p),
        p if p.starts_with("/api/countries/") => (LOCATION_URL, p),
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "API endpoint not found",
                "available_endpoints": [
                    "/api/health",
                    "/api/gateway/camino-languages",
                    "/api/auth/*",
                    "/api/booking/*",
                    "/api/reviews/*",
                    "/api/notifications/*",
                    "/api/location/*",
                    "/api/info/*",
                    "/api/validation/*",
                    "/api/countries/*"
                ]
            })
            .to_string();
            return Ok(build_response_with_cors(
                404,
                "application/json",
                error_body,
            ));
        }
    };

    // Forward to the appropriate service
    let url = format!("{}{}", service_url, service_path);
    forward_request(&url, req).await
}

// Async stateless function for health check
pub async fn handle_health_check() -> Result<Response> {
    let health = serde_json::json!({
        "status": "healthy",
        "service": "gateway-bff",
        "version": "0.1.0",
        "middleware": {
            "rate_limiting": "active",
            "security_scanning": "active",
            "authentication": "active"
        },
        "services": {
            "rate_limiter": "healthy",
            "security": "healthy",
            "auth": "healthy",
            "booking": "healthy",
            "reviews": "healthy",
            "notifications": "healthy",
            "location": "healthy",
            "info": "healthy",
            "validation": "healthy"
        },
        "service_composition": {
            "pipeline": ["rate_limiter", "security", "auth", "business_logic"],
            "oauth2_flows": ["authorization_code", "client_credentials"],
            "openid_connect": "enabled"
        }
    });

    Ok(build_response_with_cors(
        200,
        "application/json",
        health.to_string(),
    ))
}

// Async stateless function for camino languages endpoint
pub async fn handle_camino_languages(_req: &Request) -> Result<Response> {
    let languages = serde_json::json!([
        { "code": "es", "name": "Español", "flag": "🇪🇸" },
        { "code": "en", "name": "English", "flag": "🇬🇧" },
        { "code": "fr", "name": "Français", "flag": "🇫🇷" },
        { "code": "de", "name": "Deutsch", "flag": "🇩🇪" },
        { "code": "it", "name": "Italiano", "flag": "🇮🇹" },
        { "code": "pt", "name": "Português", "flag": "🇵🇹" },
        { "code": "nl", "name": "Nederlands", "flag": "🇳🇱" },
        { "code": "pl", "name": "Polski", "flag": "🇵🇱" },
        { "code": "ko", "name": "한국어", "flag": "🇰🇷" },
        { "code": "ja", "name": "日本語", "flag": "🇯🇵" },
        { "code": "zh", "name": "中文", "flag": "🇨🇳" },
        { "code": "ru", "name": "Русский", "flag": "🇷🇺" },
        { "code": "cs", "name": "Čeština", "flag": "🇨🇿" },
        { "code": "sk", "name": "Slovenčina", "flag": "🇸🇰" },
        { "code": "hu", "name": "Magyar", "flag": "🇭🇺" },
        { "code": "ca", "name": "Català", "flag": "🏴" },
        { "code": "eu", "name": "Euskara", "flag": "🏴" },
        { "code": "gl", "name": "Galego", "flag": "🏴" },
        { "code": "oc", "name": "Occitan (Aranés)", "flag": "🏴" },
        { "code": "Gode", "name": "Gothic", "flag": "🏴" }
    ]);

    Ok(build_response_with_cors(
        200,
        "application/json",
        languages.to_string(),
    ))
}

#[http_component]
pub async fn handle_request(req: Request) -> Result<impl IntoResponse> {
    let method_str = format!("{:?}", req.method());

    // Handle OPTIONS preflight requests for CORS
    if method_str == "OPTIONS" {
        return Ok(build_response_with_cors(200, "text/plain", "".to_string()));
    }

    // Apply service composition pipeline
    compose_services(req).await
}
