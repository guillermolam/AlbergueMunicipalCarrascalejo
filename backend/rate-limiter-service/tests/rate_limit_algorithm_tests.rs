use rate_limiter_service::*;
use std::collections::HashMap;

#[cfg(test)]
mod rate_limit_algorithm_tests {
    use super::*;

    #[test]
    fn test_get_current_timestamp() {
        let timestamp = get_current_timestamp();
        assert!(timestamp > 0, "Timestamp should be positive");

        // Test that timestamps are increasing
        std::thread::sleep(std::time::Duration::from_millis(10));
        let timestamp2 = get_current_timestamp();
        assert!(
            timestamp2 >= timestamp,
            "Timestamps should be non-decreasing"
        );
    }

    #[test]
    fn test_calculate_rate_limit_new_entry() {
        let current_time = 1000;
        let result = calculate_rate_limit(None, current_time, 60, 10);

        let (allowed, entry, remaining) = result;
        assert!(allowed, "New entry should be allowed");
        assert_eq!(entry.requests, 1);
        assert_eq!(entry.window_start, current_time);
        assert_eq!(entry.last_request, current_time);
        assert_eq!(remaining, 9);
    }

    #[test]
    fn test_calculate_rate_limit_within_window() {
        let current_time = 1000;
        let existing = RateLimitEntry {
            requests: 5,
            window_start: 1000,
            last_request: 1000,
        };

        let result = calculate_rate_limit(Some(existing.clone()), current_time + 30, 60, 10);
        let (allowed, entry, remaining) = result;

        assert!(allowed, "Request within limit should be allowed");
        assert_eq!(entry.requests, 6);
        assert_eq!(entry.window_start, 1000);
        assert_eq!(entry.last_request, current_time + 30);
        assert_eq!(remaining, 4);
    }

    #[test]
    fn test_calculate_rate_limit_window_expired() {
        let current_time = 1000;
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1000,
        };

        let result = calculate_rate_limit(Some(existing.clone()), current_time + 61, 60, 10);
        let (allowed, entry, remaining) = result;

        assert!(allowed, "Expired window should reset and allow");
        assert_eq!(entry.requests, 1);
        assert_eq!(entry.window_start, current_time + 61);
        assert_eq!(entry.last_request, current_time + 61);
        assert_eq!(remaining, 9);
    }

    #[test]
    fn test_calculate_rate_limit_limit_exceeded() {
        let current_time = 1000;
        let existing = RateLimitEntry {
            requests: 10,
            window_start: 1000,
            last_request: 1000,
        };

        let result = calculate_rate_limit(Some(existing.clone()), current_time + 30, 60, 10);
        let (allowed, entry, remaining) = result;

        assert!(!allowed, "Request over limit should be denied");
        assert_eq!(entry.requests, 10);
        assert_eq!(entry.window_start, 1000);
        assert_eq!(entry.last_request, 1000);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_calculate_rate_limit_edge_cases() {
        // Test with zero window (should always reset)
        let current_time = 1000;
        let existing = RateLimitEntry {
            requests: 5,
            window_start: 1000,
            last_request: 1000,
        };

        let result = calculate_rate_limit(Some(existing.clone()), current_time, 0, 10);
        let (allowed, entry, remaining) = result;

        assert!(allowed, "Zero window should reset");
        assert_eq!(entry.requests, 1);

        // Test with max requests = 0 (should always deny)
        let result = calculate_rate_limit(None, current_time, 60, 0);
        let (allowed, entry, remaining) = result;

        assert!(!allowed, "Zero max requests should deny");
        assert_eq!(entry.requests, 1);
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_extract_client_id() {
        use http::{HeaderMap, Request};

        // Test with x-forwarded-for header
        let mut headers = HeaderMap::new();
        headers.insert("x-forwarded-for", "192.168.1.1".parse().unwrap());
        let req = Request::builder()
            .uri("http://example.com/test")
            .method("GET")
            .headers(headers)
            .body(vec![])
            .unwrap();

        let client_id = extract_client_id(&req);
        assert_eq!(client_id, "192.168.1.1");

        // Test with x-real-ip header
        let mut headers = HeaderMap::new();
        headers.insert("x-real-ip", "10.0.0.1".parse().unwrap());
        let req = Request::builder()
            .uri("http://example.com/test")
            .method("GET")
            .headers(headers)
            .body(vec![])
            .unwrap();

        let client_id = extract_client_id(&req);
        assert_eq!(client_id, "10.0.0.1");

        // Test with no headers (should return "unknown")
        let req = Request::builder()
            .uri("http://example.com/test")
            .method("GET")
            .body(vec![])
            .unwrap();

        let client_id = extract_client_id(&req);
        assert_eq!(client_id, "unknown");
    }
}
