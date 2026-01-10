use location_service::handlers::RequestHandler;
use location_service::models::CountryData;
use http::{Method, Request, StatusCode};
use serde_json;

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_full_request_response_cycle() {
        // Test complete request/response cycle for known country
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/ES")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        
        assert_eq!(http_response.status(), StatusCode::OK);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["data"]["code"], "ES");
        assert_eq!(json_response["data"]["name"], "Spain");
    }

    #[tokio::test]
    async fn test_cors_headers_present() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/FR")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        
        let headers = http_response.headers();
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
        assert!(headers.get("content-type").unwrap().to_str().unwrap().contains("application/json"));
    }

    #[tokio::test]
    async fn test_multiple_requests_same_country() {
        // Test that multiple requests for the same country work correctly
        for _ in 0..3 {
            let request = Request::builder()
                .method(Method::GET)
                .uri("/api/countries/PT")
                .body(vec![])
                .unwrap();

            let response = RequestHandler::handle_request(request).await.unwrap();
            let http_response = response.into_response();
            assert_eq!(http_response.status(), StatusCode::OK);
            
            let body = String::from_utf8(http_response.into_body()).unwrap();
            let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
            assert_eq!(json_response["data"]["code"], "PT");
        }
    }

    #[tokio::test]
    async fn test_error_response_format() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/INVALID")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::NOT_FOUND);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["message"], "Country not found");
    }

    #[tokio::test]
    async fn test_options_preflight() {
        let request = Request::builder()
            .method(Method::OPTIONS)
            .uri("/api/countries/IT")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::OK);
        
        let headers = http_response.headers();
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
        assert_eq!(headers.get("Access-Control-Allow-Methods").unwrap(), "GET, POST, PUT, DELETE, OPTIONS");
    }

    #[tokio::test]
    async fn test_response_content_type() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/IT")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        
        let headers = http_response.headers();
        let content_type = headers.get("content-type").unwrap().to_str().unwrap();
        assert!(content_type.contains("application/json"));
    }

    #[tokio::test]
    async fn test_all_known_countries() {
        let known_countries = ["ES", "FR", "PT", "IT", "DE", "GB"];
        
        for country_code in known_countries {
            let request = Request::builder()
                .method(Method::GET)
                .uri(format!("/api/countries/{}" , country_code))
                .body(vec![])
                .unwrap();

            let response = RequestHandler::handle_request(request).await.unwrap();
            let http_response = response.into_response();
            assert_eq!(http_response.status(), StatusCode::OK);
            
            let body = String::from_utf8(http_response.into_body()).unwrap();
            let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
            assert_eq!(json_response["data"]["code"], country_code);
        }
    }

    #[tokio::test]
    async fn test_warm_cache_endpoint() {
        let request = Request::builder()
            .method(Method::POST)
            .uri("/api/countries/warm-cache")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::OK);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json_response["success"].as_bool().unwrap());
        assert_eq!(json_response["data"], "Cache warmed successfully");
    }

    #[tokio::test]
    async fn test_list_countries_endpoint() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::OK);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json_response["success"].as_bool().unwrap());
        assert!(json_response["data"].is_array());
    }

    #[tokio::test]
    async fn test_clear_cache_endpoint() {
        let request = Request::builder()
            .method(Method::DELETE)
            .uri("/api/countries/cache")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::OK);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(json_response["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_bad_request_empty_country_code() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::BAD_REQUEST);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_not_found_endpoint() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/unknown")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::NOT_FOUND);
        
        let body = String::from_utf8(http_response.into_body()).unwrap();
        let json_response: serde_json::Value = serde_json::from_str(&body).unwrap();
        assert!(!json_response["success"].as_bool().unwrap());
    }

    #[tokio::test]
    async fn test_invalid_method() {
        let request = Request::builder()
            .method(Method::PUT)
            .uri("/api/countries/ES")
            .body(vec![])
            .unwrap();

        let response = RequestHandler::handle_request(request).await.unwrap();
        let http_response = response.into_response();
        assert_eq!(http_response.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn test_cache_warmup_integration() {
        // Test that warm cache endpoint works and populates cache
        let warm_request = Request::builder()
            .method(Method::POST)
            .uri("/api/countries/warm-cache")
            .body(vec![])
            .unwrap();

        let warm_response = RequestHandler::handle_request(warm_request).await.unwrap();
        let warm_http_response = warm_response.into_response();
        assert_eq!(warm_http_response.status(), StatusCode::OK);

        // Now test that countries are accessible
        for country_code in ["ES", "FR", "PT", "IT"] {
            let request = Request::builder()
                .method(Method::GET)
                .uri(format!("/api/countries/{}" , country_code))
                .body(vec![])
                .unwrap();

            let response = RequestHandler::handle_request(request).await.unwrap();
            let http_response = response.into_response();
            assert_eq!(http_response.status(), StatusCode::OK);
        }
    }

    #[tokio::test]
    async fn test_performance_multiple_requests() {
        use std::time::Instant;
        
        let start = Instant::now();
        
        for country_code in ["ES", "FR", "PT", "IT"] {
            let request = Request::builder()
                .method(Method::GET)
                .uri(format!("/api/countries/{}" , country_code))
                .body(vec![])
                .unwrap();

            let response = RequestHandler::handle_request(request).await.unwrap();
            let http_response = response.into_response();
            assert_eq!(http_response.status(), StatusCode::OK);
        }
        
        let duration = start.elapsed();
        assert!(duration.as_millis() < 1000); // Should complete quickly
    }
}