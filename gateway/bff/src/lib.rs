
use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
};
use std::collections::HashMap;
use tokio::task;
use futures::future::try_join_all;

// Import all service modules
mod auth_service;
mod auth_verify;
mod booking_service;
mod info_on_arrival_service;
mod location_service;
mod notification_service;
mod rate_limiter_service;
mod reviews_service;
mod security_service;
mod validation_service;

#[derive(Serialize, Deserialize)]
struct Review {
    id: String,
    author_name: String,
    rating: u8,
    text: String,
    date: String,
    source: String,
    verified: bool,
    helpful_count: u32,
}

#[derive(Serialize, Deserialize)]
struct ReviewsResponse {
    reviews: Vec<Review>,
    total_count: u32,
    average_rating: f32,
    source_breakdown: HashMap<String, u32>,
}

#[derive(Serialize, Deserialize)]
struct HealthStatus {
    status: String,
    service: String,
    version: String,
    timestamp: String,
    dependencies: Vec<DependencyHealth>,
}

#[derive(Serialize, Deserialize)]
struct DependencyHealth {
    name: String,
    status: String,
    response_time_ms: u64,
}

// Stateless pure function for CORS headers
fn create_cors_headers() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type, Authorization"),
    ]
}

// Stateless pure function for response building
fn build_response_with_cors(status: u16, content_type: &str, body: String) -> Response {
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

// Async stateless function for health checks
async fn check_dependency_health(service_name: &str, endpoint: &str) -> DependencyHealth {
    let start = std::time::Instant::now();
    
    // Simulate async health check - in real implementation would make HTTP request
    let status = match service_name {
        "database" => "healthy",
        "auth0" => "healthy", 
        "external_apis" => "healthy",
        _ => "unknown"
    };
    
    // Simulate some async work
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    
    DependencyHealth {
        name: service_name.to_string(),
        status: status.to_string(),
        response_time_ms: start.elapsed().as_millis() as u64,
    }
}

// Async stateless function for comprehensive health check
async fn perform_health_check() -> Result<HealthStatus> {
    let services = vec![
        ("database", "/health"),
        ("auth0", "/health"),
        ("external_apis", "/health"),
    ];
    
    // Use tokio to spawn concurrent health checks
    let health_checks: Vec<_> = services
        .into_iter()
        .map(|(name, endpoint)| {
            task::spawn(check_dependency_health(name, endpoint))
        })
        .collect();
    
    // Wait for all health checks to complete
    let mut dependencies = Vec::new();
    for check in health_checks {
        dependencies.push(check.await?);
    }
    
    Ok(HealthStatus {
        status: "ok".to_string(),
        service: "gateway-bff".to_string(),
        version: "0.1.0".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        dependencies,
    })
}

// Stateless pure function for route matching
fn match_route(path: &str) -> Option<&'static str> {
    match path {
        "/api/health" => Some("health"),
        path if path.starts_with("/api/auth/") => Some("auth"),
        path if path.starts_with("/api/booking/") => Some("booking"),
        path if path.starts_with("/api/reviews/") => Some("reviews"),
        path if path.starts_with("/api/security/") => Some("security"),
        path if path.starts_with("/api/rate-limit/") => Some("rate_limit"),
        path if path.starts_with("/api/notifications/") => Some("notifications"),
        path if path.starts_with("/api/location/") => Some("location"),
        path if path.starts_with("/api/info/") => Some("info"),
        path if path.starts_with("/api/validation/") => Some("validation"),
        _ => None,
    }
}

// Async stateless function for request processing
async fn process_request(req: Request, route_type: &str) -> Result<Response> {
    match route_type {
        "health" => {
            let health = perform_health_check().await?;
            let body = serde_json::to_string(&health)?;
            Ok(build_response_with_cors(200, "application/json", body))
        }
        "auth" => auth_verify::handle(&req).await,
        "booking" => booking_service::handle(&req).await,
        "reviews" => reviews_service::handle(&req).await,
        "security" => security_service::handle(&req).await,
        "rate_limit" => rate_limiter_service::handle(&req).await,
        "notifications" => notification_service::handle(&req).await,
        "location" => location_service::handle(&req).await,
        "info" => info_on_arrival_service::handle(&req).await,
        "validation" => validation_service::handle(&req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "API endpoint not found"
            }).to_string();
            Ok(build_response_with_cors(404, "application/json", error_body))
        }
    }
}

#[http_component]
async fn handle_request(req: Request) -> Result<impl IntoResponse> {
    let path = req.uri().path();
    let method = req.method().as_str();

    // Handle OPTIONS preflight requests
    if method == "OPTIONS" {
        return Ok(build_response_with_cors(200, "text/plain", "".to_string()));
    }

    // Use stateless function to determine route
    if let Some(route_type) = match_route(path) {
        // Process request asynchronously
        process_request(req, route_type).await
    } else {
        // Return 404 for unknown routes
        let error_body = serde_json::json!({
            "error": "Not Found",
            "message": "API endpoint not found"
        }).to_string();
        Ok(build_response_with_cors(404, "application/json", error_body))
    }
}
