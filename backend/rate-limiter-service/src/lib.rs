use anyhow::Result;
use futures::future::try_join_all;
use http::{Method, Request, StatusCode};
use serde::{Deserialize, Serialize};
use spin_sdk::http::{IntoResponse, ResponseBuilder};
use spin_sdk::http_component;
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::task;

#[derive(Serialize, Deserialize, Clone)]
struct RateLimitEntry {
    requests: u32,
    window_start: u64,
    last_request: u64,
}

#[derive(Serialize, Deserialize)]
struct RateLimitRequest {
    client_id: String,
    endpoint: String,
    method: String,
}

#[derive(Serialize, Deserialize)]
struct RateLimitResponse {
    allowed: bool,
    remaining: u32,
    reset_time: u64,
    retry_after: Option<u32>,
}

// Stateless pure function for calculating current timestamp
fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

// Stateless pure function for token bucket algorithm
fn calculate_rate_limit(
    entry: Option<RateLimitEntry>,
    current_time: u64,
    window_seconds: u32,
    max_requests: u32,
) -> (bool, RateLimitEntry, u32) {
    let window_duration = window_seconds as u64;

    match entry {
        Some(mut existing) => {
            // Reset window if expired
            if current_time >= existing.window_start + window_duration {
                existing.requests = 1;
                existing.window_start = current_time;
                existing.last_request = current_time;
                (true, existing, max_requests - 1)
            } else if existing.requests < max_requests {
                existing.requests += 1;
                existing.last_request = current_time;
                (true, existing, max_requests - existing.requests)
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

// Stateless pure function for generating client ID from request
fn extract_client_id(req: &Request<Vec<u8>>) -> String {
    // Use IP address or API key as client identifier
    req.headers()
        .get("x-forwarded-for")
        .or_else(|| req.headers().get("x-real-ip"))
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string()
}

// Async stateless function for concurrent rate limit checks
async fn check_multiple_limits(
    client_id: String,
    checks: Vec<(String, u32, u32)>, // (endpoint, window_seconds, max_requests)
) -> Result<Vec<(String, bool, u32)>> {
    let current_time = get_current_timestamp();

    let tasks: Vec<_> = checks
        .into_iter()
        .map(|(endpoint, window_seconds, max_requests)| {
            let client_id = client_id.clone();
            task::spawn(async move {
                // Simulate storage lookup
                tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;

                let entry = None; // Would fetch from storage
                let (allowed, _new_entry, remaining) =
                    calculate_rate_limit(entry, current_time, window_seconds, max_requests);

                Ok::<(String, bool, u32), anyhow::Error>((endpoint, allowed, remaining))
            })
        })
        .collect();

    let results = try_join_all(tasks).await?;
    Ok(results.into_iter().collect::<Result<Vec<_>, _>>()?)
}

// Async stateless function for comprehensive rate limiting
async fn perform_rate_limit_check(
    req: &Request<Vec<u8>>,
    config: HashMap<String, (u32, u32)>, // endpoint -> (window_seconds, max_requests)
) -> Result<RateLimitResponse> {
    let client_id = extract_client_id(req);
    let path = req.uri().path();
    let method = req.method().as_str();

    let endpoint_key = format!("{}:{}", method, path);

    if let Some(&(window_seconds, max_requests)) = config.get(&endpoint_key) {
        let current_time = get_current_timestamp();

        // Simulate async storage operations
        let storage_task = task::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            None::<RateLimitEntry> // Would fetch from Redis/database
        });

        let entry = storage_task.await?;
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(entry, current_time, window_seconds, max_requests);

        // Simulate async storage save
        let _save_task = task::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
            // Would save new_entry to storage
            Ok::<(), anyhow::Error>(())
        });

        Ok(RateLimitResponse {
            allowed,
            remaining,
            reset_time: new_entry.window_start + window_seconds as u64,
            retry_after: if allowed { None } else { Some(window_seconds) },
        })
    } else {
        // Default rate limit for unspecified endpoints
        Ok(RateLimitResponse {
            allowed: true,
            remaining: 100,
            reset_time: get_current_timestamp() + 60,
            retry_after: None,
        })
    }
}

// Stateless pure function for building responses
fn build_rate_limit_response(
    status: StatusCode,
    response: &RateLimitResponse,
) -> Result<impl IntoResponse> {
    let mut builder = ResponseBuilder::new(status)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .header("X-RateLimit-Remaining", response.remaining.to_string())
        .header("X-RateLimit-Reset", response.reset_time.to_string());

    if let Some(retry_after) = response.retry_after {
        builder = builder.header("Retry-After", retry_after.to_string());
    }

    Ok(builder.body(serde_json::to_string(response)?).build())
}

#[http_component]
async fn handle_request(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let method = req.method();
    let path = req.uri().path();

    // Configure rate limits for different endpoints
    let mut config = HashMap::new();
    config.insert("POST:/booking".to_string(), (60, 10)); // 10 requests per minute
    config.insert("POST:/validation".to_string(), (60, 20)); // 20 requests per minute
    config.insert("GET:/reviews".to_string(), (60, 100)); // 100 requests per minute

    match (method, path) {
        (&Method::POST, "/rate-limit/check") => handle_rate_limit_check(req, config).await,
        (&Method::GET, "/rate-limit/status") => handle_rate_limit_status(req).await,
        (&Method::POST, "/rate-limit/reset") => handle_rate_limit_reset(req).await,
        _ => Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .body(r#"{"error":"Rate limit endpoint not found"}"#)
            .build()),
    }
}

async fn handle_rate_limit_check(
    req: Request<Vec<u8>>,
    config: HashMap<String, (u32, u32)>,
) -> Result<impl IntoResponse> {
    let result = perform_rate_limit_check(&req, config).await?;

    let status = if result.allowed {
        StatusCode::OK
    } else {
        StatusCode::TOO_MANY_REQUESTS
    };

    build_rate_limit_response(status, &result)
}

async fn handle_rate_limit_status(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
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

    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(status.to_string())
        .build())
}

async fn handle_rate_limit_reset(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let body = std::str::from_utf8(req.body())?;
    let reset_req: serde_json::Value = serde_json::from_str(body)?;
    let client_id = reset_req["client_id"].as_str().unwrap_or("unknown");

    let reset_task = task::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;

        // Simulate clearing rate limit entries for client
        serde_json::json!({
            "success": true,
            "message": format!("Rate limits reset for client: {}", client_id),
            "timestamp": get_current_timestamp()
        })
    });

    let result = reset_task.await?;

    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(result.to_string())
        .build())
}
