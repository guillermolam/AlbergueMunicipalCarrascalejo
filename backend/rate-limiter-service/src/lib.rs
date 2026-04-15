#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::implicit_hasher,
    clippy::option_if_let_else
)]

// spin_sdk::http::{Method, Request} are plain Rust structs — safe to import on
// native for tests.  Only Store::open_default() and #[http_component] produce
// WASM host-import / component-export symbols that the native linker rejects.
use spin_sdk::http::Request;

// Method is only used by the WASM handler, but we expose the type so callers
// (including tests) can build requests without importing spin_sdk themselves.
#[allow(unused_imports)]
pub use spin_sdk::http::Method;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

// ── Public types ─────────────────────────────────────────────────────────────

pub type RateLimitConfig = HashMap<String, (u32, u32)>;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RateLimitEntry {
    pub requests: u32,
    pub window_start: u64,
    pub last_request: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RateLimitResponse {
    pub allowed: bool,
    pub remaining: u32,
    pub reset_time: u64,
    pub retry_after: Option<u32>,
}

// ── Pure public functions (testable on any platform) ─────────────────────────

/// Returns the current Unix timestamp in seconds.
#[must_use]
pub fn get_current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs()
}

/// Fixed-window rate-limit algorithm — pure, no I/O.
///
/// Returns `(allowed, updated_entry, remaining_requests)`.
#[must_use]
pub fn calculate_rate_limit(
    entry: Option<RateLimitEntry>,
    current_time: u64,
    window_seconds: u32,
    max_requests: u32,
) -> (bool, RateLimitEntry, u32) {
    // Zero-limit policy: always deny, but still count the attempt.
    if max_requests == 0 {
        let mut e = entry.unwrap_or(RateLimitEntry {
            requests: 0,
            window_start: current_time,
            last_request: current_time,
        });
        e.requests = e.requests.saturating_add(1);
        e.last_request = current_time;
        return (false, e, 0);
    }

    let window_duration = u64::from(window_seconds);

    match entry {
        Some(mut existing) => {
            if current_time >= existing.window_start + window_duration {
                // Window expired — fresh start.
                existing.requests = 1;
                existing.window_start = current_time;
                existing.last_request = current_time;
                (true, existing, max_requests - 1)
            } else if existing.requests < max_requests {
                // Within window, under limit.
                existing.requests += 1;
                existing.last_request = current_time;
                let used = existing.requests;
                (true, existing, max_requests - used)
            } else {
                // Limit exceeded.
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

/// Extracts a client identifier from request headers.
///
/// Priority: `x-forwarded-for` → `x-real-ip` → `"unknown"`.
/// Empty / whitespace-only header values are treated as absent.
pub fn extract_client_id(req: &Request) -> String {
    for header_name in &["x-forwarded-for", "x-real-ip"] {
        if let Some(v) = req.header(header_name) {
            let val = String::from_utf8_lossy(v.as_bytes()).trim().to_string();
            if !val.is_empty() {
                return val;
            }
        }
    }
    "unknown".to_string()
}

// ── WASM-only handler (uses host functions — never compiled for native) ───────

#[cfg(target_arch = "wasm32")]
mod wasm_handler {
    use super::{
        calculate_rate_limit, extract_client_id, get_current_timestamp, RateLimitConfig,
        RateLimitEntry, RateLimitResponse,
    };
    use anyhow::Result;
    use http::StatusCode;
    use spin_sdk::http::{Method, Request, Response};
    use spin_sdk::http_component;
    use spin_sdk::key_value::Store;
    use std::collections::HashMap;

    fn method_str(method: &Method) -> &'static str {
        match method {
            Method::Get => "GET",
            Method::Post => "POST",
            Method::Put => "PUT",
            Method::Delete => "DELETE",
            Method::Patch => "PATCH",
            Method::Head => "HEAD",
            Method::Options => "OPTIONS",
            _ => "OTHER",
        }
    }

    fn default_config() -> RateLimitConfig {
        let mut config = HashMap::new();
        config.insert("POST:/booking".to_string(), (60, 10));
        config.insert("POST:/validation".to_string(), (60, 20));
        config.insert("GET:/reviews".to_string(), (60, 100));
        config
    }

    fn load_entry(store: &Store, key: &str) -> Option<RateLimitEntry> {
        store
            .get(key)
            .ok()
            .flatten()
            .and_then(|b| serde_json::from_slice(&b).ok())
    }

    fn save_entry(store: &Store, key: &str, entry: &RateLimitEntry) {
        if let Ok(bytes) = serde_json::to_vec(entry) {
            let _ = store.set(key, &bytes);
        }
    }

    fn build_response(status: StatusCode, rl: &RateLimitResponse) -> Result<Response> {
        let mut builder = Response::builder();
        builder.status(status);
        builder.header("content-type", "application/json");
        builder.header("Access-Control-Allow-Origin", "*");
        builder.header("X-RateLimit-Remaining", rl.remaining.to_string());
        builder.header("X-RateLimit-Reset", rl.reset_time.to_string());
        if let Some(retry_after) = rl.retry_after {
            builder.header("Retry-After", retry_after.to_string());
        }
        Ok(builder.body(serde_json::to_vec(rl)?).build())
    }

    fn request_path(req: &Request) -> String {
        req.uri()
            .parse::<http::Uri>()
            .ok()
            .and_then(|u| u.path_and_query().map(|pq| pq.path().to_string()))
            .unwrap_or_else(|| "/".to_string())
    }

    #[http_component]
    fn handle_request(req: Request) -> Result<Response> {
        let path = request_path(&req);
        match (req.method(), path.as_str()) {
            (&Method::Post, "/rate-limit/check") => handle_rate_limit_check(req),
            (&Method::Get, "/rate-limit/status") => handle_rate_limit_status(&req),
            (&Method::Post, "/rate-limit/reset") => handle_rate_limit_reset(req),
            _ => Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(r#"{"error":"Rate limit endpoint not found"}"#.as_bytes().to_vec())
                .build()),
        }
    }

    fn handle_rate_limit_check(req: Request) -> Result<Response> {
        let config = default_config();
        let client_id = extract_client_id(&req);
        let method = method_str(req.method());
        let path = request_path(&req);
        let endpoint_key = format!("{method}:{path}");

        let (window_seconds, max_requests) =
            config.get(&endpoint_key).copied().unwrap_or((60, 100));

        let store = Store::open_default()?;
        let storage_key = format!("{client_id}:{endpoint_key}");
        let entry = load_entry(&store, &storage_key);

        let current_time = get_current_timestamp();
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(entry, current_time, window_seconds, max_requests);

        save_entry(&store, &storage_key, &new_entry);

        let rl = RateLimitResponse {
            allowed,
            remaining,
            reset_time: new_entry.window_start + u64::from(window_seconds),
            retry_after: if allowed { None } else { Some(window_seconds) },
        };

        let status = if allowed {
            StatusCode::OK
        } else {
            StatusCode::TOO_MANY_REQUESTS
        };
        build_response(status, &rl)
    }

    fn handle_rate_limit_status(req: &Request) -> Result<Response> {
        let client_id = extract_client_id(req);
        let body = serde_json::json!({
            "client_id": client_id,
            "timestamp": get_current_timestamp(),
        });
        Ok(Response::builder()
            .status(StatusCode::OK)
            .body(serde_json::to_vec(&body)?)
            .build())
    }

    fn handle_rate_limit_reset(req: Request) -> Result<Response> {
        let body_bytes = req.body();
        let body_str = std::str::from_utf8(body_bytes)?;
        let payload: serde_json::Value = serde_json::from_str(body_str).unwrap_or_default();
        let client_id = payload["client_id"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        if let Ok(store) = Store::open_default() {
            for key in default_config().keys() {
                let _ = store.delete(&format!("{client_id}:{key}"));
            }
        }

        let result = serde_json::json!({
            "success": true,
            "message": format!("Rate limits reset for client: {client_id}"),
            "timestamp": get_current_timestamp(),
        });

        Ok(Response::builder()
            .status(StatusCode::OK)
            .body(serde_json::to_vec(&result)?)
            .build())
    }
}
