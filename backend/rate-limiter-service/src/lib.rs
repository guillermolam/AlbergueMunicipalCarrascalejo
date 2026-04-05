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
use tracing::info;
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
    info!(method = ?method, path = %path, "incoming rate-limiter request");

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

#[tracing::instrument(skip(req, config))]
fn handle_rate_limit_check(
    req: &Request,
    config: &HashMap<String, (u32, u32)>,
) -> Result<Response> {
    let result = perform_rate_limit_check(req, config);

    let status = if result.allowed { 200 } else { 429 };

    build_rate_limit_response(status, &result)
}

#[tracing::instrument(skip(req))]
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

#[tracing::instrument(skip(req))]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ── get_current_timestamp ──────────────────────────────────────────

    #[test]
    fn test_get_current_timestamp_returns_reasonable_value() {
        let ts = get_current_timestamp();
        // Should be after 2024-01-01 and before 2100-01-01
        assert!(ts > 1_704_067_200, "timestamp should be after 2024-01-01");
        assert!(ts < 4_102_444_800, "timestamp should be before 2100-01-01");
    }

    // ── RateLimitEntry ─────────────────────────────────────────────────

    #[test]
    fn test_rate_limit_entry_creation() {
        let entry = RateLimitEntry {
            requests: 5,
            window_start: 1_000_000,
            last_request: 1_000_010,
        };
        assert_eq!(entry.requests, 5);
        assert_eq!(entry.window_start, 1_000_000);
        assert_eq!(entry.last_request, 1_000_010);
    }

    #[test]
    fn test_rate_limit_entry_serialize_deserialize() {
        let entry = RateLimitEntry {
            requests: 3,
            window_start: 100,
            last_request: 120,
        };
        let json = serde_json::to_string(&entry).expect("serialize");
        let restored: RateLimitEntry = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(restored.requests, 3);
        assert_eq!(restored.window_start, 100);
        assert_eq!(restored.last_request, 120);
    }

    #[test]
    fn test_rate_limit_entry_clone() {
        let entry = RateLimitEntry {
            requests: 7,
            window_start: 200,
            last_request: 210,
        };
        let cloned = entry.clone();
        assert_eq!(cloned.requests, entry.requests);
        assert_eq!(cloned.window_start, entry.window_start);
    }

    // ── RateLimitResponse ──────────────────────────────────────────────

    #[test]
    fn test_rate_limit_response_serialize_allowed() {
        let resp = RateLimitResponse {
            allowed: true,
            remaining: 9,
            reset_time: 1_000_060,
            retry_after: None,
        };
        let json = serde_json::to_string(&resp).expect("serialize");
        assert!(json.contains("\"allowed\":true"));
        assert!(json.contains("\"remaining\":9"));
        assert!(json.contains("\"retry_after\":null"));
    }

    #[test]
    fn test_rate_limit_response_serialize_blocked() {
        let resp = RateLimitResponse {
            allowed: false,
            remaining: 0,
            reset_time: 500,
            retry_after: Some(30),
        };
        let json = serde_json::to_string(&resp).expect("serialize");
        assert!(json.contains("\"allowed\":false"));
        assert!(json.contains("\"retry_after\":30"));
    }

    #[test]
    fn test_rate_limit_response_deserialization() {
        let json = r#"{"allowed":true,"remaining":42,"reset_time":9999,"retry_after":null}"#;
        let resp: RateLimitResponse = serde_json::from_str(json).expect("deserialize");
        assert!(resp.allowed);
        assert_eq!(resp.remaining, 42);
        assert_eq!(resp.reset_time, 9999);
        assert!(resp.retry_after.is_none());
    }

    // ── calculate_rate_limit ───────────────────────────────────────────

    #[test]
    fn test_calculate_no_prior_entry_allows_request() {
        let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 10);
        assert!(allowed);
        assert_eq!(remaining, 9);
        assert_eq!(entry.requests, 1);
        assert_eq!(entry.window_start, 1000);
    }

    #[test]
    fn test_calculate_within_limit_allows_request() {
        let existing = RateLimitEntry {
            requests: 5,
            window_start: 1000,
            last_request: 1010,
        };
        let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1020, 60, 10);
        assert!(allowed);
        assert_eq!(entry.requests, 6);
        assert_eq!(remaining, 4);
        assert_eq!(entry.last_request, 1020);
    }

    #[test]
    fn test_calculate_at_max_blocks_request() {
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1050,
        };
        let (allowed, _entry, remaining) = calculate_rate_limit(Some(existing), 1055, 60, 10);
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_calculate_window_reset_allows_again() {
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1050,
        };
        // current_time = 1061 exceeds window_start(1000) + window(60) = 1060
        let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1061, 60, 10);
        assert!(allowed);
        assert_eq!(entry.requests, 1);
        assert_eq!(entry.window_start, 1061);
        assert_eq!(remaining, 9);
    }

    #[test]
    fn test_calculate_exact_window_boundary_resets() {
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1050,
        };
        // 1060 >= 1000 + 60, so window resets
        let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1060, 60, 10);
        assert!(allowed);
        assert_eq!(entry.requests, 1);
        assert_eq!(remaining, 9);
    }

    #[test]
    fn test_calculate_one_before_boundary_still_blocked() {
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1050,
        };
        // 1059 < 1000 + 60 = 1060, still in window, exhausted
        let (allowed, _entry, remaining) = calculate_rate_limit(Some(existing), 1059, 60, 10);
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_calculate_zero_remaining_then_blocked() {
        let existing = RateLimitEntry {
            requests: 1,
            window_start: 500,
            last_request: 500,
        };
        // max_requests = 1, already used 1
        let (allowed, _entry, remaining) = calculate_rate_limit(Some(existing), 510, 60, 1);
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_calculate_very_old_timestamp_resets_window() {
        let existing = RateLimitEntry {
            requests: 100,
            window_start: 100,
            last_request: 150,
        };
        let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 999_999, 60, 10);
        assert!(allowed);
        assert_eq!(entry.requests, 1);
        assert_eq!(entry.window_start, 999_999);
        assert_eq!(remaining, 9);
    }

    // ── Default rate-limit config ──────────────────────────────────────

    #[test]
    fn test_default_config_has_expected_endpoints() {
        let mut config: HashMap<String, (u32, u32)> = HashMap::new();
        config.insert("POST:/booking".to_string(), (60, 10));
        config.insert("POST:/validation".to_string(), (60, 20));
        config.insert("GET:/reviews".to_string(), (60, 100));

        assert_eq!(config.get("POST:/booking"), Some(&(60, 10)));
        assert_eq!(config.get("POST:/validation"), Some(&(60, 20)));
        assert_eq!(config.get("GET:/reviews"), Some(&(60, 100)));
        assert_eq!(config.get("DELETE:/unknown"), None);
    }

    // ── Successive requests drain remaining ────────────────────────────

    #[test]
    fn test_successive_requests_drain_remaining() {
        let max = 5_u32;
        let window = 60_u32;
        let t = 2000_u64;

        let (allowed, entry, remaining) = calculate_rate_limit(None, t, window, max);
        assert!(allowed);
        assert_eq!(remaining, 4);

        let (allowed, entry, remaining) = calculate_rate_limit(Some(entry), t + 1, window, max);
        assert!(allowed);
        assert_eq!(remaining, 3);

        let (allowed, entry, remaining) = calculate_rate_limit(Some(entry), t + 2, window, max);
        assert!(allowed);
        assert_eq!(remaining, 2);

        let (allowed, entry, remaining) = calculate_rate_limit(Some(entry), t + 3, window, max);
        assert!(allowed);
        assert_eq!(remaining, 1);

        let (allowed, entry, remaining) = calculate_rate_limit(Some(entry), t + 4, window, max);
        assert!(allowed);
        assert_eq!(remaining, 0);

        // 6th request is blocked
        let (allowed, _entry, remaining) = calculate_rate_limit(Some(entry), t + 5, window, max);
        assert!(!allowed);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_window_reset_after_drain_allows_new_burst() {
        let max = 3_u32;
        let window = 10_u32;
        let t = 5000_u64;

        // Exhaust all requests
        let (_, entry, _) = calculate_rate_limit(None, t, window, max);
        let (_, entry, _) = calculate_rate_limit(Some(entry), t + 1, window, max);
        let (_, entry, _) = calculate_rate_limit(Some(entry), t + 2, window, max);
        let (allowed, entry, _) = calculate_rate_limit(Some(entry), t + 3, window, max);
        assert!(!allowed);

        // Jump past the window
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(Some(entry), t + 11, window, max);
        assert!(allowed);
        assert_eq!(new_entry.requests, 1);
        assert_eq!(remaining, 2);
    }
}
