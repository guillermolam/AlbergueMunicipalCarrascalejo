#![allow(unused)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

use anyhow::Result;
use futures::future::try_join_all;
use http::StatusCode;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{Request, Response, Method};
use spin_sdk::http_component;
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::task;

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
struct RateLimitRequest {
    client_id: String,
    endpoint: String,
    method: String,
}

#[derive(Serialize, Deserialize)]
pub struct RateLimitResponse {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u32>,
}

pub fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

pub fn calculate_rate_limit(
    entry: Option<RateLimitEntry>,
    current_time: u64,
    window_seconds: u32,
    max_requests: u32,
) -> (bool, RateLimitEntry, u32) {
    let window_duration = window_seconds as u64;

    match entry {
        Some(mut existing) => {
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
        }
        None => {
            let new_entry = RateLimitEntry {
                requests: 1,
                window_start: current_time,
                last_request: current_time,
            };
            (true, new_entry, max_requests - 1)
        }
    }
}

pub fn extract_client_id(req: &Request) -> String {
    let headers: Vec<_> = req.headers().collect();
    
    // Check x-forwarded-for
    if let Some((_, v)) = headers.iter().find(|(k, _)| k.to_lowercase() == "x-forwarded-for") {
        return String::from_utf8_lossy(v.as_bytes()).to_string();
    }
    
    // Check x-real-ip
    if let Some((_, v)) = headers.iter().find(|(k, _)| k.to_lowercase() == "x-real-ip") {
        return String::from_utf8_lossy(v.as_bytes()).to_string();
    }

    "unknown".to_string()
}

async fn check_multiple_limits(
    client_id: String,
    checks: Vec<(String, u32, u32)>,
) -> Result<Vec<(String, bool, u32)>> {
    let current_time = get_current_timestamp();

    let tasks: Vec<_> = checks
        .into_iter()
        .map(|(endpoint, window_seconds, max_requests)| {
            let _client_id = client_id.clone();
            task::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
                let entry = None;
                let (allowed, _new_entry, remaining) =
                    calculate_rate_limit(entry, current_time, window_seconds, max_requests);
                Ok::<(String, bool, u32), anyhow::Error>((endpoint, allowed, remaining))
            })
        })
        .collect();

    let results = try_join_all(tasks).await?;
    Ok(results.into_iter().collect::<Result<Vec<_>, _>>()?)
}

pub async fn perform_rate_limit_check(
    req: &Request,
    config: HashMap<String, (u32, u32)>,
) -> Result<RateLimitResponse> {
    let _client_id = extract_client_id(req);
    let path = req.uri();
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

    let endpoint_key = format!("{}:{}", method, path);

    if let Some(&(window_seconds, max_requests)) = config.get(&endpoint_key) {
        let current_time = get_current_timestamp();

        let storage_task = task::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            None::<RateLimitEntry>
        });

        let entry = storage_task.await?;
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(entry, current_time, window_seconds, max_requests);

        let _save_task = task::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
            Ok::<(), anyhow::Error>(())
        });

        Ok(RateLimitResponse {
            allowed,
            remaining,
            reset_time: new_entry.window_start + window_seconds as u64,
            retry_after: if allowed { None } else { Some(window_seconds) },
        })
    } else {
        Ok(RateLimitResponse {
            allowed: true,
            remaining: 100,
            reset_time: get_current_timestamp() + 60,
            retry_after: None,
        })
    }
}

fn build_rate_limit_response(
    status: StatusCode,
    response: &RateLimitResponse,
) -> Result<Response> {
    let mut builder = Response::builder();
    builder.status(status);
    builder.header("content-type", "application/json");
    builder.header("Access-Control-Allow-Origin", "*");
    builder.header("X-RateLimit-Remaining", response.remaining.to_string());
    builder.header("X-RateLimit-Reset", response.reset_time.to_string());

    if let Some(retry_after) = response.retry_after {
        builder.header("Retry-After", retry_after.to_string());
    }

    Ok(builder.body(serde_json::to_vec(response)?).build())
}

#[http_component]
async fn handle_request(req: Request) -> Result<Response> {
    let method = req.method();
    let path = req.uri();

    let mut config = HashMap::new();
    config.insert("POST:/booking".to_string(), (60, 10));
    config.insert("POST:/validation".to_string(), (60, 20));
    config.insert("GET:/reviews".to_string(), (60, 100));

    match (method, path) {
        (&Method::Post, "/rate-limit/check") => handle_rate_limit_check(req, config).await,
        (&Method::Get, "/rate-limit/status") => handle_rate_limit_status(req).await,
        (&Method::Post, "/rate-limit/reset") => handle_rate_limit_reset(req).await,
        _ => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(r#"{"error":"Rate limit endpoint not found"}"#.as_bytes().to_vec())
            .build())
    }
}

async fn handle_rate_limit_check(
    req: Request,
    config: HashMap<String, (u32, u32)>,
) -> Result<Response> {
    let result = perform_rate_limit_check(&req, config).await?;

    let status = if result.allowed {
        StatusCode::OK
    } else {
        StatusCode::TOO_MANY_REQUESTS
    };

    build_rate_limit_response(status, &result)
}

async fn handle_rate_limit_status(req: Request) -> Result<Response> {
    let client_id = extract_client_id(&req);

    let status_task = task::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;

        serde_json::json!({
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
        })
    });

    let status = status_task.await?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(serde_json::to_vec(&status)?)
        .build())
}

async fn handle_rate_limit_reset(req: Request) -> Result<Response> {
    let body = req.body();
    let body_str = std::str::from_utf8(body)?;
    let reset_req: serde_json::Value = serde_json::from_str(body_str)?;
    let client_id = reset_req["client_id"].as_str().unwrap_or("unknown").to_string();

    let reset_task = task::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;

        serde_json::json!({
            "success": true,
            "message": format!("Rate limits reset for client: {}", client_id),
            "timestamp": get_current_timestamp()
        })
    });

    let result = reset_task.await?;

    Ok(Response::builder()
        .status(StatusCode::OK)
        .body(serde_json::to_vec(&result)?)
        .build())
}
