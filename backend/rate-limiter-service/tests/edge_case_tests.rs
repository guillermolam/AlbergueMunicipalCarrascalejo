use http::Request;
use rate_limiter_service::{
    calculate_rate_limit as calculate_rate_limit_for_test,
    extract_client_id as extract_client_id_for_test,
    perform_rate_limit_check as perform_rate_limit_check_for_test, RateLimitEntry,
};
use std::collections::HashMap;

#[cfg(test)]
mod edge_case_tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_with_zero_window() {
        let mut config = HashMap::new();
        config.insert("GET:/api/zero-window".to_string(), (0, 10)); // Zero window

        let req = Request::builder()
            .uri("http://example.com/api/zero-window")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(result.is_ok(), "Zero window should be handled gracefully");
        let response = result.unwrap();
        assert!(response.allowed, "Zero window should reset and allow");
    }

    #[tokio::test]
    async fn test_rate_limit_with_zero_max_requests() {
        let mut config = HashMap::new();
        config.insert("GET:/api/zero-max".to_string(), (60, 0)); // Zero max requests

        let req = Request::builder()
            .uri("http://example.com/api/zero-max")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(
            result.is_ok(),
            "Zero max requests should be handled gracefully"
        );
        let response = result.unwrap();
        assert!(!response.allowed, "Zero max requests should deny");
        assert_eq!(response.remaining, 0);
    }

    #[tokio::test]
    async fn test_rate_limit_with_very_large_window() {
        let mut config = HashMap::new();
        config.insert("GET:/api/large-window".to_string(), (u32::MAX, 100)); // Very large window

        let req = Request::builder()
            .uri("http://example.com/api/large-window")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(result.is_ok(), "Large window should be handled gracefully");
        let response = result.unwrap();
        assert!(response.allowed, "First request should be allowed");
    }

    #[tokio::test]
    async fn test_rate_limit_with_very_large_max_requests() {
        let mut config = HashMap::new();
        config.insert("GET:/api/large-max".to_string(), (60, u32::MAX)); // Very large max

        let req = Request::builder()
            .uri("http://example.com/api/large-max")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(
            result.is_ok(),
            "Large max requests should be handled gracefully"
        );
        let response = result.unwrap();
        assert!(response.allowed, "First request should be allowed");
        assert_eq!(response.remaining, u32::MAX - 1);
    }

    #[tokio::test]
    async fn test_extract_client_id_with_malformed_headers() {
        // Header values in `http` must be valid ASCII / header-value bytes.
        // Simulate a malformed/empty client id header instead.
        let req = Request::builder()
            .uri("http://example.com/test")
            .method("GET")
            .header("x-forwarded-for", "")
            .body(vec![])
            .unwrap();

        let client_id = extract_client_id_for_test(&req);
        assert_eq!(
            client_id, "unknown",
            "Malformed/empty headers should default to unknown"
        );
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_unicode_endpoint() {
        let mut config = HashMap::new();
        config.insert("GET:/api/unicode-测试".to_string(), (60, 10));

        let req = Request::builder()
            .uri("http://example.com/api/unicode-测试")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(
            result.is_ok(),
            "Unicode endpoints should be handled gracefully"
        );
        let response = result.unwrap();
        assert!(response.allowed, "First request should be allowed");
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_empty_endpoint() {
        let mut config = HashMap::new();
        config.insert("".to_string(), (60, 10)); // Empty endpoint

        let req = Request::builder()
            .uri("http://example.com/")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        // Should use default since empty endpoint won't match
        assert!(result.is_ok(), "Empty endpoint should use default");
        let response = result.unwrap();
        assert!(response.allowed, "Default should allow");
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_special_characters() {
        let mut config = HashMap::new();
        config.insert("GET:/api/special-chars!@#$%^&*()".to_string(), (60, 10));

        let req = Request::builder()
            .uri("http://example.com/api/special-chars!@#$%^&*()")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(
            result.is_ok(),
            "Special characters should be handled gracefully"
        );
        let response = result.unwrap();
        assert!(response.allowed, "First request should be allowed");
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_overflow_scenarios() {
        // Test near u32::MAX values
        let mut config = HashMap::new();
        config.insert("GET:/api/overflow".to_string(), (60, u32::MAX));

        let req = Request::builder()
            .uri("http://example.com/api/overflow")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check_for_test(&req, config).await;

        assert!(
            result.is_ok(),
            "Overflow scenarios should be handled gracefully"
        );
        let response = result.unwrap();
        assert!(response.allowed);
        assert_eq!(response.remaining, u32::MAX - 1);
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_boundary_timestamps() {
        // Test with timestamp at Unix epoch boundary
        let current_time = 0;
        let existing = RateLimitEntry {
            requests: 5,
            window_start: 0,
            last_request: 0,
        };

        let result = calculate_rate_limit_for_test(Some(existing), current_time, 60, 10);
        let (allowed, entry, remaining) = result;

        assert!(allowed, "Boundary timestamp should be handled");
        assert_eq!(entry.requests, 6);
        assert_eq!(remaining, 4);
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_negative_remaining_calculation() {
        // This shouldn't happen in practice, but test edge case
        let current_time = 1000;
        let existing = RateLimitEntry {
            requests: 15, // More than max_requests
            window_start: 1000,
            last_request: 1000,
        };

        let result = calculate_rate_limit_for_test(Some(existing), current_time, 60, 10);
        let (allowed, entry, remaining) = result;

        assert!(!allowed, "Should deny when over limit");
        assert_eq!(entry.requests, 15);
        assert_eq!(remaining, 0); // Should not go negative
    }
}
