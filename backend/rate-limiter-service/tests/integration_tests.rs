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

// ── Entry state machine ───────────────────────────────────────────────────────

#[test]
fn test_entry_transitions_new_to_existing() {
    let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, 60, 10);
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(remaining, 9);

    let (allowed, entry, remaining) = calculate_rate_limit(
        Some(RateLimitEntry {
            requests: 5,
            window_start: 1000,
            last_request: 1010,
        }),
        1020,
        60,
        10,
    );
    assert!(allowed);
    assert_eq!(entry.requests, 6);
    assert_eq!(remaining, 4);

    let (allowed, _entry, remaining) = calculate_rate_limit(
        Some(RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1030,
        }),
        1035,
        60,
        10,
    );
    assert!(!allowed);
    assert_eq!(remaining, 0);

    let (allowed, entry, remaining) = calculate_rate_limit(
        Some(RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1030,
        }),
        1100,
        60,
        10,
    );
    assert!(allowed);
    assert_eq!(entry.requests, 1);
    assert_eq!(entry.window_start, 1100);
    assert_eq!(remaining, 9);
}

#[test]
fn test_multiple_endpoints_independent_limits() {
    for &(window, max) in &[(60u32, 10u32), (60, 20), (60, 100)] {
        let (allowed, entry, remaining) = calculate_rate_limit(None, 1000, window, max);
        assert!(allowed);
        assert_eq!(entry.requests, 1);
        assert_eq!(remaining, max - 1);
    }
}

// ── Client-ID extraction priority ─────────────────────────────────────────────

#[test]
fn test_x_forwarded_for_beats_x_real_ip() {
    let req = req_with_headers(&[
        ("x-forwarded-for", "192.168.1.1"),
        ("x-real-ip", "10.0.0.1"),
    ]);
    assert_eq!(extract_client_id(&req), "192.168.1.1");
}

#[test]
fn test_x_real_ip_used_when_no_forwarded() {
    let req = req_with_headers(&[("x-real-ip", "10.0.0.1")]);
    assert_eq!(extract_client_id(&req), "10.0.0.1");
}

#[test]
fn test_unknown_when_no_ip_headers_present() {
    let req = req_with_headers(&[]);
    assert_eq!(extract_client_id(&req), "unknown");
}

// ── Sequential client simulation ──────────────────────────────────────────────

#[test]
fn test_independent_clients_have_separate_budgets() {
    for i in 0..5u32 {
        let (allowed, entry, remaining) = calculate_rate_limit(None, 1000 + u64::from(i), 60, 10);
        assert!(allowed, "client {i} first request should be allowed");
        assert_eq!(entry.requests, 1);
        assert_eq!(remaining, 9);
    }
}

#[test]
fn test_same_client_request_sequence() {
    let mut entry: Option<RateLimitEntry> = None;

    for i in 0..10u32 {
        let (allowed, new_entry, remaining) =
            calculate_rate_limit(entry.clone(), 1000 + u64::from(i), 60, 10);
        assert!(allowed, "request {i} should be allowed");
        assert_eq!(remaining, 10 - i - 1);
        entry = Some(new_entry);
    }

    let (allowed, _entry, remaining) = calculate_rate_limit(entry, 1010, 60, 10);
    assert!(!allowed, "11th request should be denied");
    assert_eq!(remaining, 0);
}
