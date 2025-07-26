use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Request, Response},
    http_component,
};
use std::collections::HashMap;

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

#[http_component]
async fn handle_request(req: Request) -> Result<impl IntoResponse> {
    let path = req.uri().path();

    // Add CORS headers
    let mut response_builder = Response::builder()
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if req.method().as_str() == "OPTIONS" {
        return Ok(response_builder.status(200).body("").build());
    }

    // Route to appropriate service based on path
    match path {
        // Health check
        "/api/health" => handle_health().await,

        // Auth routes
        path if path.starts_with("/api/auth/") => {
            auth_verify::handle(&req).await
        }

        // Booking routes
        path if path.starts_with("/api/booking/") => {
            booking_service::handle(&req).await
        }

        // Reviews routes
        path if path.starts_with("/api/reviews/") => {
            reviews_service::handle(&req).await
        }

        // Security routes
        path if path.starts_with("/api/security/") => {
            security_service::handle(&req).await
        }

        // Rate limiter routes
        path if path.starts_with("/api/rate-limit/") => {
            rate_limiter_service::handle(&req).await
        }

        // Notification routes
        path if path.starts_with("/api/notifications/") => {
            notification_service::handle(&req).await
        }

        // Location routes
        path if path.starts_with("/api/location/") => {
            location_service::handle(&req).await
        }

        // Info on arrival routes
        path if path.starts_with("/api/info/") => {
            info_on_arrival_service::handle(&req).await
        }

        // Validation routes
        path if path.starts_with("/api/validation/") => {
            validation_service::handle(&req).await
        }

        // Default 404
        _ => {
            Ok(response_builder
                .status(404)
                .header("Content-Type", "application/json")
                .body(r#"{"error":"Not Found","message":"API endpoint not found"}"#)
                .build())
        }
    }
}

async fn handle_health() -> Result<Response> {
    let health = serde_json::json!({
        "status": "ok",
        "service": "gateway-bff",
        "version": "0.1.0",
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(health.to_string())
        .build())
}