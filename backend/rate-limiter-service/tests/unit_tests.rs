use rate_limiter_service::*;
use http::{Request, StatusCode};
use std::collections::HashMap;

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[tokio::test]
    async fn test_check_multiple_limits() {
        let client_id = "test-client".to_string();
        let checks = vec![
            ("/api/test1".to_string(), 60, 10),
            ("/api/test2".to_string(), 30, 5),
            ("/api/test3".to_string(), 3600, 100),
        ];

        let results = check_multiple_limits(client_id, checks).await;

        assert!(results.is_ok(), "check_multiple_limits should succeed");
        let results = results.unwrap();
        assert_eq!(results.len(), 3);

        for (endpoint, allowed, remaining) in results {
            assert!(allowed, "All requests should be allowed for new clients");
            match endpoint.as_str() {
                "/api/test1" => assert_eq!(remaining, 9),
                "/api/test2" => assert_eq!(remaining, 4),
                "/api/test3" => assert_eq!(remaining, 99),
                _ => panic!("Unexpected endpoint"),
            }
        }
    }

    #[tokio::test]
    async fn test_perform_rate_limit_check_with_config() {
        let mut config = HashMap::new();
        config.insert("GET:/api/test".to_string(), (60, 10));

        let req = Request::builder()
            .uri("http://example.com/api/test")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check(&req, config).await;

        assert!(result.is_ok(), "perform_rate_limit_check should succeed");
        let response = result.unwrap();
        assert!(response.allowed, "First request should be allowed");
        assert_eq!(response.remaining, 9);
        assert!(response.reset_time > 0);
        assert_eq!(response.retry_after, None);
    }

    #[tokio::test]
    async fn test_perform_rate_limit_check_no_config() {
        let config = HashMap::new(); // Empty config

        let req = Request::builder()
            .uri("http://example.com/api/test")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = perform_rate_limit_check(&req, config).await;

        assert!(result.is_ok(), "perform_rate_limit_check should succeed with default");
        let response = result.unwrap();
        assert!(response.allowed, "Default should allow requests");
        assert_eq!(response.remaining, 100);
        assert!(response.reset_time > 0);
        assert_eq!(response.retry_after, None);
    }

    #[tokio::test]
    async fn test_build_rate_limit_response_allowed() {
        let response = RateLimitResponse {
            allowed: true,
            remaining: 5,
            reset_time: 1234567890,
            retry_after: None,
        };

        let result = build_rate_limit_response(StatusCode::OK, &response);

        assert!(result.is_ok(), "build_rate_limit_response should succeed");
    }

    #[tokio::test]
    async fn test_build_rate_limit_response_denied() {
        let response = RateLimitResponse {
            allowed: false,
            remaining: 0,
            reset_time: 1234567890,
            retry_after: Some(60),
        };

        let result = build_rate_limit_response(StatusCode::TOO_MANY_REQUESTS, &response);

        assert!(result.is_ok(), "build_rate_limit_response should succeed");
    }

    #[tokio::test]
    async fn test_handle_rate_limit_status() {
        let req = Request::builder()
            .uri("http://example.com/rate-limit/status")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = handle_rate_limit_status(req).await;

        assert!(result.is_ok(), "handle_rate_limit_status should succeed");
    }

    #[tokio::test]
    async fn test_handle_rate_limit_reset() {
        let body = r#"{"client_id": "test-client"}"#;
        let req = Request::builder()
            .uri("http://example.com/rate-limit/reset")
            .method("POST")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_rate_limit_reset(req).await;

        assert!(result.is_ok(), "handle_rate_limit_reset should succeed");
    }

    #[tokio::test]
    async fn test_handle_rate_limit_reset_invalid_json() {
        let body = "invalid json content";
        let req = Request::builder()
            .uri("http://example.com/rate-limit/reset")
            .method("POST")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_rate_limit_reset(req).await;

        // Should still succeed with default client_id
        assert!(result.is_ok(), "handle_rate_limit_reset should handle invalid JSON gracefully");
    }
}