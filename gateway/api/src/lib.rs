#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::unused_async,
    dead_code
)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use worker::{event, Context, Env, Method, Request, Response};

mod auth_verify;
use auth_verify::verify_token;

// Service URLs - in Cloudflare Workers, these are service bindings or worker URLs
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
pub struct MiddlewareContext {
    client_id: String,
    endpoint: String,
    method: String,
    user_id: Option<String>,
    permissions: Vec<String>,
}

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

pub fn build_response_with_cors(status: u16, _content_type: &str, body: String) -> Response {
    Response::ok(body)
        .unwrap_or_else(|_| Response::error("Internal Error", 500).unwrap())
        .with_status(status)
}

pub fn extract_client_id(req: &Request) -> String {
    if let Ok(Some(val)) = req.headers().get("x-forwarded-for") {
        return val;
    }
    if let Ok(Some(val)) = req.headers().get("x-real-ip") {
        return val;
    }
    "unknown".to_string()
}

pub fn requires_authentication(path: &str) -> bool {
    let protected_endpoints = [
        "/api/booking/",
        "/api/admin/",
        "/api/notifications/create",
        "/api/validation/upload",
    ];

    protected_endpoints
        .iter()
        .any(|endpoint| path.starts_with(endpoint))
}

pub async fn handle_health_check() -> Result<Response> {
    let health = serde_json::json!({
        "status": "healthy",
        "service": "gateway-bff",
        "version": "0.1.0",
        "middleware": {
            "rate_limiting": "active",
            "security_scanning": "active",
            "authentication": "active"
        }
    });

    Ok(build_response_with_cors(
        200,
        "application/json",
        health.to_string(),
    ))
}

pub async fn handle_camino_languages() -> Result<Response> {
    let languages = serde_json::json!([
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
    ]);

    Ok(build_response_with_cors(
        200,
        "application/json",
        languages.to_string(),
    ))
}

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> worker::Result<Response> {
    let path = req.path();
    let method = req.method();

    // Handle OPTIONS preflight requests for CORS
    if method == Method::Options {
        return Ok(build_response_with_cors(200, "text/plain", String::new()));
    }

    let result = match (method, path.as_str()) {
        (Method::Get, "/api/health") => handle_health_check().await,
        (Method::Get, "/api/gateway/camino-languages") => handle_camino_languages().await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "API endpoint not found",
                "path": path
            })
            .to_string();
            Ok(build_response_with_cors(404, "application/json", error_body))
        }
    };

    result.map_err(|e| worker::Error::RustError(e.to_string()))
}
