
use anyhow::Result;
use spin_sdk::http::{Request, Method};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    use crate::integration::create_test_request;
    
    #[tokio::test]
    async fn test_all_route_patterns() -> Result<()> {
        let test_cases = vec![
            ("/api/health", "health"),
            ("/api/auth/login", "auth"),
            ("/api/auth/logout", "auth"),
            ("/api/auth/callback", "auth"),
            ("/api/booking/create", "booking"),
            ("/api/booking/admin/stats", "booking"),
            ("/api/reviews/list", "reviews"),
            ("/api/reviews/create", "reviews"),
            ("/api/security/check", "security"),
            ("/api/security/validate", "security"),
            ("/api/rate-limit/check", "rate_limit"),
            ("/api/notifications/send", "notifications"),
            ("/api/notifications/status", "notifications"),
            ("/api/location/nearby", "location"),
            ("/api/location/directions", "location"),
            ("/api/info/arrival", "info"),
            ("/api/info/local", "info"),
            ("/api/validation/dni", "validation"),
            ("/api/validation/passport", "validation"),
        ];
        
        for (path, expected_route) in test_cases {
            assert_eq!(match_route(path), Some(expected_route), "Failed for path: {}", path);
        }
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_unknown_routes_return_404() -> Result<()> {
        let unknown_paths = vec![
            "/api/unknown",
            "/api/",
            "/",
            "/health",
            "/auth/login",
            "/api/booking",
            "/api/reviews",
            "/api/invalid/endpoint"
        ];
        
        for path in unknown_paths {
            let req = create_test_request(Method::GET, path, vec![]);
            let response = handle_request(req).await?;
            assert_eq!(response.status(), 404, "Expected 404 for path: {}", path);
            
            let body = response.body();
            let error_response: serde_json::Value = serde_json::from_slice(body)?;
            assert_eq!(error_response["error"], "Not Found");
        }
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_route_processing_with_different_methods() -> Result<()> {
        let methods = vec![Method::GET, Method::POST, Method::PUT, Method::DELETE];
        
        for method in methods {
            let req = create_test_request(method, "/api/health", vec![]);
            let response = handle_request(req).await?;
            
            // Health endpoint should work with any method
            if method == Method::OPTIONS {
                assert_eq!(response.status(), 200);
            } else {
                assert_eq!(response.status(), 200);
            }
        }
        
        Ok(())
    }
    
    #[test]
    fn test_edge_case_routes() {
        // Test edge cases in route matching
        assert_eq!(match_route("/api/auth/"), Some("auth"));
        assert_eq!(match_route("/api/booking/"), Some("booking"));
        assert_eq!(match_route("/api/reviews/"), Some("reviews"));
        
        // Test non-matching cases
        assert_eq!(match_route("/auth/login"), None);
        assert_eq!(match_route("api/health"), None);
        assert_eq!(match_route("/api"), None);
        assert_eq!(match_route(""), None);
    }
}
