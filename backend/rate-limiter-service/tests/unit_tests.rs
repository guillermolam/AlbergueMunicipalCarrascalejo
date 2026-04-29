use rate_limiter_service::{
    calculate_rate_limit, extract_client_id, get_current_timestamp, RateLimitEntry,
};
use spin_sdk::http::{Method, Request};

// ── get_current_timestamp ─────────────────────────────────────────────────────

#[test]
fn test_get_current_timestamp_is_positive() {
    assert!(get_current_timestamp() > 0);
}

#[test]
fn test_get_current_timestamp_is_non_decreasing() {
    let t1 = get_current_timestamp();
    let t2 = get_current_timestamp();
    assert!(t2 >= t1);
}

// ── calculate_rate_limit ──────────────────────────────────────────────────────

#[test]
fn test_new_entry_is_allowed() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1000);
    assert_eq!(entry.last_request, 1000);
    assert_eq!(remaining, 9);
}

#[test]
fn test_within_window_and_under_limit() {
    let existing = RateLimitEntry {
        requests: 3,
        window_start: 1000,
        last_request: 1005,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1010, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 4);
    assert_eq!(entry.window_start, 1000);
    assert_eq!(remaining, 6);
}

#[test]
fn test_window_expired_resets_counter() {
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1050,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1070, 60, 10);
    assert!(allowed, "request in fresh window should be allowed");
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1070);
    assert_eq!(remaining, 9);
}

#[test]
fn test_limit_exceeded_is_denied() {
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1005,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1010, 60, 10);
    assert!(!allowed);
    assert_eq!(entry.requests, 10);
    assert_eq!(remaining, 0);
}

#[test]
fn test_zero_max_requests_always_denies() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 0);
    assert!(!allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, 0);
}

#[test]
fn test_zero_window_always_resets() {
    let existing = RateLimitEntry {
        requests: 5,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, _remaining) = calculate_rate_limit(Some(existing), 1000, 0, 10);
    assert!(allowed, "zero-length window always resets");
    assert_eq!(entry.requests, 1);
}

#[test]
fn test_exactly_at_limit_boundary() {
    let existing = RateLimitEntry {
        requests: 9,
        window_start: 1000,
        last_request: 1020,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1030, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 10);
    assert_eq!(remaining, 0);
}

// ── extract_client_id ─────────────────────────────────────────────────────────

fn req_with_headers(headers: &[(&str, &str)]) -> Request {
    let mut b = Request::builder();
    b.method(Method::Get).uri("http://example.com/test");
    for (k, v) in headers {
        b.header(*k, *v);
    }
    b.build()
}

#[test]
fn test_extract_x_forwarded_for() {
    let req = req_with_headers(&[("x-forwarded-for", "192.168.1.1")]);
    assert_eq!(extract_client_id(&req), "192.168.1.1");
}

#[test]
fn test_extract_x_real_ip_fallback() {
    let req = req_with_headers(&[("x-real-ip", "10.0.0.1")]);
    assert_eq!(extract_client_id(&req), "10.0.0.1");
}

#[test]
fn test_x_forwarded_for_takes_priority_over_x_real_ip() {
    let req = req_with_headers(&[("x-forwarded-for", "1.2.3.4"), ("x-real-ip", "5.6.7.8")]);
    assert_eq!(extract_client_id(&req), "1.2.3.4");
}

#[test]
fn test_no_ip_headers_returns_unknown() {
    let req = req_with_headers(&[]);
    assert_eq!(extract_client_id(&req), "unknown");
}

#[test]
fn test_empty_forwarded_for_falls_back_to_unknown() {
    let req = req_with_headers(&[("x-forwarded-for", "")]);
    assert_eq!(extract_client_id(&req), "unknown");
}
