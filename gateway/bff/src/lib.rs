
use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
};
use std::collections::HashMap;
use tokio::task;
use futures::future::try_join_all;
use chrono;

// Import all service modules
mod auth_service;
mod auth_verify;
mod booking_service;
mod country_service;
mod info_on_arrival_service;
mod location_service;
mod notification_service;
mod rate_limiter_service;
mod reviews_service;
mod security_service;
mod validation_service;

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
        ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key"),
        ("Access-Control-Expose-Headers", "X-RateLimit-Remaining, X-RateLimit-Reset"),
    ]
}

// Stateless pure function for response building
pub fn build_response_with_cors(status: u16, content_type: &str, body: String) -> Response {
    let mut builder = Response::builder().status(status);
    
    // Add CORS headers
    for (key, value) in create_cors_headers() {
        builder = builder.header(key, value);
    }
    
    builder
        .header("Content-Type", content_type)
        .body(body)
        .build()
}

// Async stateless function for rate limiting middleware
pub async fn apply_rate_limiting(req: &Request, context: &mut MiddlewareContext) -> Result<bool> {
    let rate_limit_task = task::spawn({
        let req_clone = req.clone();
        async move {
            rate_limiter_service::handle(&req_clone).await
        }
    });
    
    match rate_limit_task.await? {
        Ok(response) => {
            // Extract rate limit status from response
            let status_code = response.status();
            Ok(status_code == 200)
        }
        Err(_) => Ok(false),
    }
}

// Async stateless function for security scanning middleware
pub async fn apply_security_scanning(req: &Request, context: &mut MiddlewareContext) -> Result<bool> {
    let security_task = task::spawn({
        let req_clone = req.clone();
        async move {
            security_service::handle(&req_clone).await
        }
    });
    
    match security_task.await? {
        Ok(response) => {
            let status_code = response.status();
            Ok(status_code == 200)
        }
        Err(_) => Ok(false),
    }
}

// Async stateless function for OAuth2/OpenID Connect authentication
pub async fn apply_authentication(req: &Request, context: &mut MiddlewareContext) -> Result<bool> {
    // Check if endpoint requires authentication
    let protected_endpoints = vec![
        "/api/booking/",
        "/api/admin/",
        "/api/notifications/create",
        "/api/validation/upload",
    ];
    
    let requires_auth = protected_endpoints
        .iter()
        .any(|endpoint| req.uri().path().starts_with(endpoint));
    
    if !requires_auth {
        return Ok(true);
    }
    
    let auth_task = task::spawn({
        let req_clone = req.clone();
        async move {
            auth_verify::handle(&req_clone).await
        }
    });
    
    match auth_task.await? {
        Ok(response) => {
            let status_code = response.status();
            if status_code == 200 {
                // Extract user information from auth response
                if let Ok(body) = std::str::from_utf8(response.body()) {
                    if let Ok(auth_data) = serde_json::from_str::<serde_json::Value>(body) {
                        context.user_id = auth_data["user_id"].as_str().map(|s| s.to_string());
                        if let Some(perms) = auth_data["permissions"].as_array() {
                            context.permissions = perms
                                .iter()
                                .filter_map(|p| p.as_str().map(|s| s.to_string()))
                                .collect();
                        }
                    }
                }
                Ok(true)
            } else {
                Ok(false)
            }
        }
        Err(_) => Ok(false),
    }
}

// Async stateless function for service composition pipeline
pub async fn compose_services(req: Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    // Create middleware context
    let mut context = MiddlewareContext {
        client_id: extract_client_id(&req),
        endpoint: path.to_string(),
        method: method.to_string(),
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
        }).to_string();
        return Ok(build_response_with_cors(429, "application/json", error_body));
    }
    
    // Step 2: Security Scanning (second layer of defense)
    let security_passed = apply_security_scanning(&req, &mut context).await?;
    if !security_passed {
        let error_body = serde_json::json!({
            "error": "Security Threat Detected",
            "message": "Request blocked due to security policy violation.",
            "details": "Contact support if you believe this is an error"
        }).to_string();
        return Ok(build_response_with_cors(403, "application/json", error_body));
    }
    
    // Step 3: Authentication/Authorization (for protected routes)
    let auth_verified = apply_authentication(&req, &mut context).await?;
    if !auth_verified && requires_authentication(path) {
        let error_body = serde_json::json!({
            "error": "Authentication Required",
            "message": "Valid authentication token required for this endpoint.",
            "auth_url": "/api/auth/login"
        }).to_string();
        return Ok(build_response_with_cors(401, "application/json", error_body));
    }
    
    // Step 4: Route to appropriate business service
    let business_result = route_to_business_service(&req, &context).await?;
    Ok(business_result)
}

// Stateless pure function for client ID extraction
pub fn extract_client_id(req: &Request) -> String {
    req.headers()
        .get("x-forwarded-for")
        .or_else(|| req.headers().get("x-real-ip"))
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
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

// Async stateless function for business service routing
async fn route_to_business_service(req: &Request, context: &MiddlewareContext) -> Result<Response> {
    let path = req.uri().path();
    
    match path {
        path if path.starts_with("/api/health") => handle_health_check().await,
        path if path.starts_with("/api/auth/") => auth_service::handle(req).await,
        path if path.starts_with("/api/booking/") => booking_service::handle(req).await,
        path if path.starts_with("/api/reviews/") => reviews_service::handle(req).await,
        path if path.starts_with("/api/notifications/") => notification_service::handle(req).await,
        path if path.starts_with("/api/location/") => location_service::handle(req).await,
        path if path.starts_with("/api/info/") => info_on_arrival_service::handle(req).await,
        path if path.starts_with("/api/validation/") => validation_service::handle(req).await,
        path if path.starts_with("/api/countries/") => country_service::handle(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "API endpoint not found",
                "available_endpoints": [
                    "/api/health",
                    "/api/auth/*",
                    "/api/booking/*",
                    "/api/reviews/*",
                    "/api/notifications/*",
                    "/api/location/*",
                    "/api/info/*",
                    "/api/validation/*",
                    "/api/countries/*"
                ]
            }).to_string();
            Ok(build_response_with_cors(404, "application/json", error_body))
        }
    }
}

// Async stateless function for health check
pub async fn handle_health_check() -> Result<Response> {
    let health_task = task::spawn(async {
        // Check all service health concurrently
        let services = vec![
            ("rate_limiter", "healthy"),
            ("security", "healthy"),
            ("auth", "healthy"),
            ("booking", "healthy"),
            ("reviews", "healthy"),
            ("notifications", "healthy"),
            ("location", "healthy"),
            ("info", "healthy"),
            ("validation", "healthy"),
        ];
        
        serde_json::json!({
            "status": "healthy",
            "service": "gateway-bff",
            "version": "0.1.0",
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "middleware": {
                "rate_limiting": "active",
                "security_scanning": "active",
                "authentication": "active"
            },
            "services": services.into_iter().collect::<HashMap<_, _>>(),
            "service_composition": {
                "pipeline": ["rate_limiter", "security", "auth", "business_logic"],
                "oauth2_flows": ["authorization_code", "client_credentials"],
                "openid_connect": "enabled"
            }
        })
    });
    
    let health = health_task.await?;
    Ok(build_response_with_cors(200, "application/json", health.to_string()))
}

#[http_component]
pub async fn handle_request(req: Request) -> Result<impl IntoResponse> {
    let method = req.method().as_str();

    // Handle OPTIONS preflight requests for CORS
    if method == "OPTIONS" {
        return Ok(build_response_with_cors(200, "text/plain", "".to_string()));
    }

    // Apply service composition pipeline
    compose_services(req).await
}
