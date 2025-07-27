
use anyhow::Result;
use spin_sdk::http::{Request, Method};
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    use crate::integration::create_test_request;
    
    #[tokio::test]
    async fn test_cors_headers_on_all_endpoints() -> Result<()> {
        let endpoints = vec![
            "/api/health",
            "/api/auth/login",
            "/api/booking/create",
            "/api/reviews/list",
            "/api/security/check",
            "/api/rate-limit/check",
            "/api/notifications/send",
            "/api/location/nearby",
            "/api/info/arrival",
            "/api/validation/dni"
        ];
        
        for endpoint in endpoints {
            let req = create_test_request(Method::GET, endpoint, vec![]);
            let response = handle_request(req).await?;
            
            let headers: HashMap<String, String> = response.headers()
                .iter()
                .map(|(k, v)| (k.as_str().to_lowercase(), v.to_str().unwrap().to_string()))
                .collect();
                
            assert!(headers.contains_key("access-control-allow-origin"));
            assert!(headers.contains_key("access-control-allow-methods"));
            assert!(headers.contains_key("access-control-allow-headers"));
        }
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_options_preflight_all_endpoints() -> Result<()> {
        let endpoints = vec![
            "/api/auth/login",
            "/api/booking/create",
            "/api/reviews/list",
            "/api/security/check"
        ];
        
        for endpoint in endpoints {
            let req = create_test_request(Method::OPTIONS, endpoint, vec![
                ("Origin", "http://localhost:5173"),
                ("Access-Control-Request-Method", "POST"),
                ("Access-Control-Request-Headers", "Content-Type,Authorization")
            ]);
            
            let response = handle_request(req).await?;
            assert_eq!(response.status(), 200);
            
            let body = response.body();
            assert!(body.is_empty());
        }
        
        Ok(())
    }
    
    #[test]
    fn test_cors_headers_content() {
        let headers = create_cors_headers();
        
        let origin_header = headers.iter().find(|(k, _)| *k == "Access-Control-Allow-Origin").unwrap();
        assert_eq!(origin_header.1, "*");
        
        let methods_header = headers.iter().find(|(k, _)| *k == "Access-Control-Allow-Methods").unwrap();
        assert!(methods_header.1.contains("GET"));
        assert!(methods_header.1.contains("POST"));
        assert!(methods_header.1.contains("PUT"));
        assert!(methods_header.1.contains("DELETE"));
        assert!(methods_header.1.contains("OPTIONS"));
        
        let headers_header = headers.iter().find(|(k, _)| *k == "Access-Control-Allow-Headers").unwrap();
        assert!(headers_header.1.contains("Content-Type"));
        assert!(headers_header.1.contains("Authorization"));
    }
}
