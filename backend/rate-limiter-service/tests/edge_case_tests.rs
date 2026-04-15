use rate_limiter_service::{calculate_rate_limit, extract_client_id, RateLimitEntry};
use spin_sdk::http::{Method, Request};

fn req_with_headers(headers: &[(&str, &str)]) -> Request {
    let mut b = Request::builder();
    b.method(Method::Get).uri("http://example.com/test");
    for (k, v) in headers {
        b.header(*k, *v);
    }
    b.build()
}

// ── Boundary values ───────────────────────────────────────────────────────────

#[test]
fn test_zero_max_requests_always_denied() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 0);
    assert!(!allowed, "zero max_requests must deny");
    assert_eq!(entry.requests, 1, "attempt should be counted");
    assert_eq!(remaining, 0);
}

#[test]
fn test_zero_window_always_resets() {
    let existing = RateLimitEntry {
        requests: 5,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1000, 0, 10);
    assert!(allowed, "zero window always resets");
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, 9);
}

#[test]
fn test_very_large_window() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, u32::MAX, 100);
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, 99);
}

#[test]
fn test_very_large_max_requests() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, u32::MAX);
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, u32::MAX - 1);
}

#[test]
fn test_requests_above_max_in_existing_entry() {
    // Corrupt / edge state: stored requests > max_requests.
    let existing = RateLimitEntry {
        requests: 15,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1010, 60, 10);
    assert!(!allowed, "should deny when stored count exceeds limit");
    assert_eq!(entry.requests, 15, "corrupt count should be preserved");
    assert_eq!(remaining, 0, "remaining must not underflow");
}

#[test]
fn test_unix_epoch_boundary() {
    let existing = RateLimitEntry {
        requests: 5,
        window_start: 0,
        last_request: 0,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 0, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 6);
    assert_eq!(remaining, 4);
}

#[test]
fn test_window_exactly_at_expiry() {
    // current_time == window_start + window_seconds → window expired (>=).
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1059,
    };
    let (allowed, entry, remaining) = calculate_rate_limit(Some(existing), 1060, 60, 10);
    assert!(allowed, "window expired at exact boundary should reset");
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1060);
    assert_eq!(remaining, 9);
}

// ── Header extraction edge cases ──────────────────────────────────────────────

#[test]
fn test_empty_x_forwarded_for_falls_back_to_unknown() {
    let req = req_with_headers(&[("x-forwarded-for", "")]);
    assert_eq!(extract_client_id(&req), "unknown");
}

#[test]
fn test_whitespace_only_header_treated_as_empty() {
    let req = req_with_headers(&[("x-forwarded-for", "   ")]);
    assert_eq!(extract_client_id(&req), "unknown");
}

#[test]
fn test_valid_ip_in_x_real_ip_used_as_fallback() {
    let req = req_with_headers(&[("x-forwarded-for", ""), ("x-real-ip", "172.16.0.1")]);
    assert_eq!(extract_client_id(&req), "172.16.0.1");
}

// ── Overflow safety ───────────────────────────────────────────────────────────

#[test]
fn test_no_underflow_on_remaining_calculation() {
    let existing = RateLimitEntry {
        requests: 10,
        window_start: 1000,
        last_request: 1000,
    };
    let (allowed, _entry, remaining) = calculate_rate_limit(Some(existing), 1010, 60, 10);
    assert!(!allowed);
    assert_eq!(remaining, 0);
}
