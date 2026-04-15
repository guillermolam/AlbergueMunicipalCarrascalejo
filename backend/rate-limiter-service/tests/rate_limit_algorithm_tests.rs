use rate_limiter_service::{
    calculate_rate_limit, extract_client_id, get_current_timestamp, RateLimitEntry,
};
use spin_sdk::http::{Method, Request};

fn req_with_headers(headers: &[(&str, &str)]) -> Request {
    let mut b = Request::builder();
    b.method(Method::Get).uri("http://example.com/test");
    for (k, v) in headers {
        b.header(*k, *v);
    }
    b.build()
}

// ── Timestamp ─────────────────────────────────────────────────────────────────

#[test]
fn test_get_current_timestamp_is_positive() {
    assert!(get_current_timestamp() > 0);
}

#[test]
fn test_timestamps_are_non_decreasing() {
    let t1 = get_current_timestamp();
    std::thread::sleep(std::time::Duration::from_millis(10));
    let t2 = get_current_timestamp();
    assert!(t2 >= t1);
}

// ── Algorithm correctness ─────────────────────────────────────────────────────

#[test]
fn test_new_entry() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1000);
    assert_eq!(entry.last_request, 1000);
    assert_eq!(remaining, 9);
}

#[test]
fn test_within_window() {
    let existing = RateLimitEntry {
        requests: 5,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1030, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 6);
    assert_eq!(entry.window_start, 1000);
    assert_eq!(entry.last_request, 1030);
    assert_eq!(remaining, 4);
}

#[test]
fn test_window_expired() {
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1061, 60, 10);
    assert!(allowed, "expired window resets and allows");
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1061);
    assert_eq!(entry.last_request, 1061);
    assert_eq!(remaining, 9);
}

#[test]
fn test_limit_exceeded() {
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1030, 60, 10);
    assert!(!allowed);
    assert_eq!(entry.requests, 10);
    assert_eq!(entry.window_start, 1000);
    assert_eq!(remaining, 0);
}

#[test]
fn test_zero_window_resets() {
    let existing = RateLimitEntry {
        requests: 5,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, _remaining) = calculate_rate_limit(Some(existing), 1000, 0, 10);
    assert!(allowed, "zero window always resets");
    assert_eq!(entry.requests, 1);
}

#[test]
fn test_zero_max_requests_denied() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 0);
    assert!(!allowed, "zero max_requests must deny");
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, 0);
}

// ── Client-ID extraction ──────────────────────────────────────────────────────

#[test]
fn test_extract_x_forwarded_for() {
    let req = req_with_headers(&[("x-forwarded-for", "192.168.1.1")]);
    assert_eq!(extract_client_id(&req), "192.168.1.1");
}

#[test]
fn test_extract_x_real_ip() {
    let req = req_with_headers(&[("x-real-ip", "10.0.0.1")]);
    assert_eq!(extract_client_id(&req), "10.0.0.1");
}

#[test]
fn test_extract_unknown_fallback() {
    let req = req_with_headers(&[]);
    assert_eq!(extract_client_id(&req), "unknown");
}

#[test]
fn test_forwarded_for_priority_over_real_ip() {
    let req = req_with_headers(&[
        ("x-forwarded-for", "192.168.1.1"),
        ("x-real-ip", "10.0.0.1"),
    ]);
    assert_eq!(extract_client_id(&req), "192.168.1.1");
}
