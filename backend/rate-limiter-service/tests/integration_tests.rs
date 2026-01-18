use http::{Method, Request, StatusCode};
use serde_json::{json, Value};
use std::collections::HashMap;

// Import the actual handler functions
use rate_limiter_service::*;

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_handle_request_rate_limit_check() {
        let body = json!({
            "client_id": "test-client",
            "endpoint": "/booking",
            "method": "POST"
        })
        .to_string();

        let req = Request::builder()
            .uri("http://example.com/rate-limit/check")
            .method("POST")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_request(req).await;

        assert!(result.is_ok(), "Rate limit check should succeed");
        let response = result.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
        assert!(headers.get("X-RateLimit-Remaining").is_some());
        assert!(headers.get("X-RateLimit-Reset").is_some());
    }

    #[tokio::test]
    async fn test_handle_request_rate_limit_status() {
        let req = Request::builder()
            .uri("http://example.com/rate-limit/status")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).await;

        assert!(result.is_ok(), "Rate limit status should succeed");
        let response = result.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
    }

    #[tokio::test]
    async fn test_handle_request_rate_limit_reset() {
        let body = json!({"client_id": "test-client"}).to_string();
        let req = Request::builder()
            .uri("http://example.com/rate-limit/reset")
            .method("POST")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_request(req).await;

        assert!(result.is_ok(), "Rate limit reset should succeed");
        let response = result.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let headers = response.headers();
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
    }

    #[tokio::test]
    async fn test_handle_request_not_found() {
        let req = Request::builder()
            .uri("http://example.com/nonexistent")
            .method("GET")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).await;

        assert!(result.is_ok(), "Non-existent endpoint should return 404");
        let response = result.unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        let headers = response.headers();
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
    }

    #[tokio::test]
    async fn test_handle_request_invalid_method() {
        let req = Request::builder()
            .uri("http://example.com/rate-limit/check")
            .method("DELETE")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).await;

        assert!(result.is_ok(), "Invalid method should return 404");
        let response = result.unwrap();

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_different_endpoints() {
        let test_cases = vec![
            ("POST", "/booking", 10),
            ("POST", "/validation", 20),
            ("GET", "/reviews", 100),
        ];

        for (method, endpoint, expected_remaining) in test_cases {
            let body = json!({
                "client_id": "test-client",
                "endpoint": endpoint,
                "method": method
            })
            .to_string();

            let req = Request::builder()
                .uri("http://example.com/rate-limit/check")
                .method("POST")
                .body(body.as_bytes().to_vec())
                .unwrap();

            let result = handle_request(req).await;
            assert!(
                result.is_ok(),
                "Rate limit check for {} {} should succeed",
                method,
                endpoint
            );

            let response = result.unwrap();
            assert_eq!(response.status(), StatusCode::OK);

            // Check that remaining is one less than max for first request
            let remaining_header = response.headers().get("X-RateLimit-Remaining");
            assert!(remaining_header.is_some());
            let remaining: u32 = remaining_header.unwrap().to_str().unwrap().parse().unwrap();
            assert_eq!(remaining, expected_remaining - 1);
        }
    }

    #[tokio::test]
    async fn test_rate_limit_check_with_client_headers() {
        let body = json!({
            "client_id": "test-client",
            "endpoint": "/booking",
            "method": "POST"
        })
        .to_string();

        let req = Request::builder()
            .uri("http://example.com/rate-limit/check")
            .method("POST")
            .header("x-forwarded-for", "192.168.1.100")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_request(req).await;

        assert!(
            result.is_ok(),
            "Rate limit check with client headers should succeed"
        );
        let response = result.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_concurrent_rate_limit_requests() {
        use futures::future::join_all;
        use std::sync::Arc;

        let body = json!({
            "client_id": "concurrent-client",
            "endpoint": "/booking",
            "method": "POST"
        })
        .to_string();

        let requests: Vec<_> = (0..5)
            .map(|i| {
                let body = body.clone();
                tokio::spawn(async move {
                    let req = Request::builder()
                        .uri("http://example.com/rate-limit/check")
                        .method("POST")
                        .body(body.as_bytes().to_vec())
                        .unwrap();

                    handle_request(req).await
                })
            })
            .collect();

        let results = join_all(requests).await;

        for result in results {
            assert!(result.is_ok(), "Concurrent requests should succeed");
            let response = result.unwrap();
            assert!(
                response.status().is_success(),
                "All concurrent requests should succeed"
            );
        }
    }

    #[tokio::test]
    async fn test_rate_limit_check_invalid_json() {
        let body = "invalid json content";
        let req = Request::builder()
            .uri("http://example.com/rate-limit/check")
            .method("POST")
            .body(body.as_bytes().to_vec())
            .unwrap();

        let result = handle_request(req).await;

        // Should still process with default values
        assert!(result.is_ok(), "Invalid JSON should be handled gracefully");
    }

    #[tokio::test]
    async fn test_rate_limit_check_empty_body() {
        let req = Request::builder()
            .uri("http://example.com/rate-limit/check")
            .method("POST")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).await;

        // Should still process with default values
        assert!(result.is_ok(), "Empty body should be handled gracefully");
    }
}
