use location_service::handlers::RequestHandler;
use location_service::{CacheConfig, LocationService};
use std::sync::Arc;

/// Helper to create a test handler with in-memory cache
fn test_handler() -> RequestHandler {
    RequestHandler::with_service(Arc::new(tokio::sync::Mutex::new(
        LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        })),
    )))
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_country_known() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Get,
            "/api/countries/ES".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json["success"].as_bool().unwrap());
        assert_eq!(json["data"]["code"], "ES");
        assert_eq!(json["data"]["name"], "Spain");
    }

    #[tokio::test]
    async fn test_get_country_unknown() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Get,
            "/api/countries/INVALID".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(!json["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_list_countries() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Get,
            "/api/countries".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json["success"].as_bool().unwrap());
        assert!(json["data"].is_array());
    }

    #[tokio::test]
    async fn test_warm_cache_endpoint() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Post,
            "/api/countries/warm-cache".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_clear_cache_endpoint() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Delete,
            "/api/countries/cache".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_cors_preflight() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Other("OPTIONS".to_string()),
            "/api/countries/ES".to_string(),
        );
        let _resp = handler.handle_request(&req).await.unwrap();
        // CORS preflight should not panic
    }

    #[tokio::test]
    async fn test_not_found_endpoint() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Get,
            "/api/unknown".to_string(),
        );
        let resp = handler.handle_request(&req).await.unwrap();
        let body = String::from_utf8_lossy(resp.body());
        let json: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(!json["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_empty_country_code() {
        let handler = test_handler();
        let req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Get,
            "/api/countries/".to_string(),
        );
        let _resp = handler.handle_request(&req).await.unwrap();
        // Should handle gracefully without panic
    }

    #[tokio::test]
    async fn test_multiple_requests_same_country() {
        let handler = test_handler();
        for _ in 0..3 {
            let req = spin_sdk::http::Request::new(
                spin_sdk::http::Method::Get,
                "/api/countries/ES".to_string(),
            );
            let resp = handler.handle_request(&req).await.unwrap();
            let body = String::from_utf8_lossy(resp.body());
            let json: serde_json::Value = serde_json::from_str(&body).unwrap();
            assert_eq!(json["data"]["code"], "ES");
        }
    }

    #[tokio::test]
    async fn test_performance_multiple_requests() {
        use std::time::Instant;

        let handler = test_handler();
        let start = Instant::now();

        for _ in 0..10 {
            let req = spin_sdk::http::Request::new(
                spin_sdk::http::Method::Get,
                "/api/countries/ES".to_string(),
            );
            let _resp = handler.handle_request(&req).await.unwrap();
        }

        let duration = start.elapsed();
        assert!(
            duration.as_millis() < 1000,
            "10 requests should complete in under 1s"
        );
    }
}
