
use anyhow::Result;
use spin_sdk::http::{Request, Method};
use std::collections::HashMap;

// Mock request builder for testing
pub fn create_test_request(method: Method, path: &str, headers: Vec<(&str, &str)>) -> Request {
    let mut builder = Request::builder()
        .method(method)
        .uri(format!("http://localhost:3000{}", path));
    
    for (key, value) in headers {
        builder = builder.header(key, value);
    }
    
    builder.body("").unwrap()
}

pub fn create_test_request_with_body(method: Method, path: &str, body: &str) -> Request {
    Request::builder()
        .method(method)
        .uri(format!("http://localhost:3000{}", path))
        .header("Content-Type", "application/json")
        .body(body)
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    
    #[tokio::test]
    async fn test_complete_request_flow() -> Result<()> {
        // Test health endpoint
        let health_req = create_test_request(Method::GET, "/api/health", vec![]);
        let response = handle_request(health_req).await?;
        assert_eq!(response.status(), 200);
        
        // Test auth endpoint
        let auth_req = create_test_request(Method::POST, "/api/auth/login", vec![
            ("Authorization", "Bearer test-token")
        ]);
        let response = handle_request(auth_req).await?;
        assert!(response.status() == 200 || response.status() == 401);
        
        // Test booking endpoint
        let booking_req = create_test_request_with_body(
            Method::POST, 
            "/api/booking/create",
            r#"{"guest_name":"Test User","check_in":"2024-01-01","nights":2}"#
        );
        let response = handle_request(booking_req).await?;
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_options_preflight() -> Result<()> {
        let req = create_test_request(Method::OPTIONS, "/api/booking/create", vec![
            ("Origin", "http://localhost:5173"),
            ("Access-Control-Request-Method", "POST")
        ]);
        
        let response = handle_request(req).await?;
        assert_eq!(response.status(), 200);
        
        let headers: HashMap<String, String> = response.headers()
            .iter()
            .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap().to_string()))
            .collect();
            
        assert!(headers.contains_key("access-control-allow-origin"));
        assert!(headers.contains_key("access-control-allow-methods"));
        
        Ok(())
    }
}
