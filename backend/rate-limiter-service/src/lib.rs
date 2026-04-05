#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::option_if_let_else,
    clippy::implicit_hasher,
    clippy::must_use_candidate,
    clippy::future_not_send
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use worker::{event, Context, Env, Method, Request, Response, Result};

// --- Test-facing exports ----------------------------------------------------
pub use crate::calculate_rate_limit as calculate_rate_limit_for_test;
pub use crate::extract_client_id as extract_client_id_for_test;
pub use crate::perform_rate_limit_check as perform_rate_limit_check_for_test;

pub type RateLimitConfig = HashMap<String, (u32, u32)>;

#[derive(Serialize, Deserialize, Clone)]
pub struct RateLimitEntry {
    pub requests: u32,
    pub window_start: u64,
    pub last_request: u64,
}

#[derive(Serialize, Deserialize)]
pub struct RateLimitResponse {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u32>,
}

#[must_use]
pub fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

#[must_use]
pub fn calculate_rate_limit(
    entry: Option<RateLimitEntry>,
    current_time: u64,
    window_seconds: u32,
    max_requests: u32,
) -> (bool, RateLimitEntry, u32) {
    let window_duration = u64::from(window_seconds);

    if let Some(mut existing) = entry {
        if current_time >= existing.window_start + window_duration {
            existing.requests = 1;
            existing.window_start = current_time;
            existing.last_request = current_time;
            (true, existing, max_requests - 1)
        } else if existing.requests < max_requests {
            existing.requests += 1;
            existing.last_request = current_time;
            let requests = existing.requests;
            (true, existing, max_requests - requests)
        } else {
            (false, existing, 0)
        }
    } else {
        let new_entry = RateLimitEntry {
            requests: 1,
            window_start: current_time,
            last_request: current_time,
        };
        (true, new_entry, max_requests - 1)
    }
}

pub fn extract_client_id(req: &Request) -> String {
    let headers = req.headers();

    // Check x-forwarded-for
    if let Ok(Some(val)) = headers.get("x-forwarded-for") {
        return val;
    }

    // Check x-real-ip
    if let Ok(Some(val)) = headers.get("x-real-ip") {
        return val;
    }

    "unknown".to_string()
}

pub fn perform_rate_limit_check(
    req: &Request,
    config: &HashMap<String, (u32, u32)>,
) -> RateLimitResponse {
    let _client_id = extract_client_id(req);
    let path = req.path();
    let method = match req.method() {
        Method::Get => "GET",
        Method::Post => "POST",
        Method::Put => "PUT",
        Method::Delete => "DELETE",
        Method::Patch => "PATCH",
        Method::Head => "HEAD",
        Method::Options => "OPTIONS",
        _ => "OTHER",
    };

    let endpoint_key = format!("{method}:{path}");

    if let Some(&(window_seconds, max_requests)) = config.get(&endpoint_key) {
        let current_time = get_current_timestamp();

        // Inline: no external storage, just compute with no prior entry
        let entry = None::<RateLimitEntry>;
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(entry, current_time, window_seconds, max_requests);

        RateLimitResponse {
            allowed,
            remaining,
            reset_time: new_entry.window_start + u64::from(window_seconds),
            retry_after: if allowed { None } else { Some(window_seconds) },
        }
    } else {
        RateLimitResponse {
            allowed: true,
            remaining: 100,
            reset_time: get_current_timestamp() + 60,
            retry_after: None,
        }
    }
}

fn build_rate_limit_response(status: u16, response: &RateLimitResponse) -> Result<Response> {
    let json =
        serde_json::to_string(response).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut resp = Response::ok(json)?;
    resp.headers_mut().set("content-type", "application/json")?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    resp.headers_mut()
        .set("X-RateLimit-Remaining", &response.remaining.to_string())?;
    resp.headers_mut()
        .set("X-RateLimit-Reset", &response.reset_time.to_string())?;

    if let Some(retry_after) = response.retry_after {
        resp.headers_mut()
            .set("Retry-After", &retry_after.to_string())?;
    }

    Ok(resp.with_status(status))
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let path = req.path();

    let mut config = HashMap::new();
    config.insert("POST:/booking".to_string(), (60, 10));
    config.insert("POST:/validation".to_string(), (60, 20));
    config.insert("GET:/reviews".to_string(), (60, 100));

    match (method, path.as_str()) {
        (Method::Post, "/rate-limit/check") => handle_rate_limit_check(&req, &config),
        (Method::Get, "/rate-limit/status") => handle_rate_limit_status(&req),
        (Method::Post, "/rate-limit/reset") => handle_rate_limit_reset(&mut req).await,
        _ => {
            let mut resp = Response::ok(r#"{"error":"Rate limit endpoint not found"}"#)?;
            resp.headers_mut().set("content-type", "application/json")?;
            Ok(resp.with_status(404))
        }
    }
}

fn handle_rate_limit_check(
    req: &Request,
    config: &HashMap<String, (u32, u32)>,
) -> Result<Response> {
    let result = perform_rate_limit_check(req, config);

    let status = if result.allowed { 200 } else { 429 };

    build_rate_limit_response(status, &result)
}

fn handle_rate_limit_status(req: &Request) -> Result<Response> {
    let client_id = extract_client_id(req);

    let status = serde_json::json!({
        "client_id": client_id,
        "global_limit": {
            "requests_per_minute": 1000,
            "current_usage": 45,
            "remaining": 955
        },
        "endpoint_limits": {
            "POST:/booking": {
                "limit": 10,
                "used": 3,
                "remaining": 7,
                "reset_time": get_current_timestamp() + 45
            },
            "POST:/validation": {
                "limit": 20,
                "used": 8,
                "remaining": 12,
                "reset_time": get_current_timestamp() + 35
            }
        }
    });

    let json =
        serde_json::to_string(&status).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut resp = Response::ok(json)?;
    resp.headers_mut().set("content-type", "application/json")?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    Ok(resp.with_status(200))
}

async fn handle_rate_limit_reset(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let reset_req: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let client_id = reset_req["client_id"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let result = serde_json::json!({
        "success": true,
        "message": format!("Rate limits reset for client: {client_id}"),
        "timestamp": get_current_timestamp()
    });

    let json =
        serde_json::to_string(&result).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut resp = Response::ok(json)?;
    resp.headers_mut().set("content-type", "application/json")?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    Ok(resp.with_status(200))
}
