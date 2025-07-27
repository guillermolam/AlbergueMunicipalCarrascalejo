
use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Method};
use std::collections::HashMap;

// Test helper functions
pub fn create_test_request(method: Method, path: &str, headers: Vec<(&str, &str)>) -> Request<Vec<u8>> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path);
    
    for (key, value) in headers {
        builder = builder.header(key, value);
    }
    
    builder.body(vec![]).unwrap()
}

fn create_test_request_with_body(method: Method, path: &str, headers: Option<HashMap<&str, &str>>, body: Option<&str>) -> Request<Vec<u8>> {
    let mut builder = Request::builder()
        .method(method)
        .uri(path);
    
    if let Some(headers) = headers {
        for (key, value) in headers {
            builder = builder.header(key, value);
        }
    }
    
    let body = body.unwrap_or("").as_bytes().to_vec();
    builder.body(body).unwrap()
}

#[tokio::test]
async fn test_service_composition_pipeline_success() -> Result<()> {
    // Test successful request through entire pipeline
    let mut headers = HashMap::new();
    headers.insert("authorization", "Bearer valid_access_token_123");
    headers.insert("content-type", "application/json");
    
    let req = create_test_request_with_body(
        Method::POST,
        "/api/booking/create",
        Some(headers),
        Some(r#"{"guest_name":"John Doe","check_in":"2024-01-20"}"#)
    );
    
    // Test that the request can be processed through compose_services
    let result = crate::compose_services(req).await;
    assert!(result.is_ok(), "Service composition should succeed for valid request");
    
    let response = result.unwrap();
    // Should not be rate limited, security blocked, or auth failed
    assert_ne!(response.status(), 429, "Should not be rate limited");
    assert_ne!(response.status(), 403, "Should not be security blocked");
    assert_ne!(response.status(), 401, "Should not be auth failed");
    
    Ok(())
}

#[tokio::test]
async fn test_rate_limiting_logic() -> Result<()> {
    // Test rate limiting detection
    let req = create_test_request_with_body(
        Method::GET,
        "/api/reviews/list",
        None,
        None
    );
    
    let mut context = crate::MiddlewareContext {
        client_id: "192.168.1.100".to_string(),
        endpoint: "/api/reviews/list".to_string(),
        method: "GET".to_string(),
        user_id: None,
        permissions: Vec::new(),
    };
    
    // Test rate limiting middleware
    let rate_limit_result = crate::apply_rate_limiting(&req, &mut context).await;
    assert!(rate_limit_result.is_ok(), "Rate limiting should not error");
    
    Ok(())
}

#[tokio::test]
async fn test_security_scanning_logic() -> Result<()> {
    let malicious_payloads = vec![
        r#"{"content":"<script>alert('xss')</script>"}"#,
        r#"{"content":"'; DROP TABLE users; --"}"#,
        r#"{"content":"javascript:alert(1)"}"#,
    ];
    
    for payload in malicious_payloads {
        let req = create_test_request_with_body(
            Method::POST,
            "/api/booking/create",
            None,
            Some(payload)
        );
        
        let mut context = crate::MiddlewareContext {
            client_id: "192.168.1.100".to_string(),
            endpoint: "/api/booking/create".to_string(),
            method: "POST".to_string(),
            user_id: None,
            permissions: Vec::new(),
        };
        
        // Test security scanning middleware
        let security_result = crate::apply_security_scanning(&req, &mut context).await;
        assert!(security_result.is_ok(), "Security scanning should not error for payload: {}", payload);
    }
    
    Ok(())
}

#[tokio::test]
async fn test_oauth2_authentication_flow() -> Result<()> {
    // Test OAuth2 authorization code flow
    let req = create_test_request_with_body(
        Method::GET,
        "/api/auth/callback?code=auth_code_123&state=csrf_state_456",
        None,
        None
    );
    
    // Test auth verification handler
    let result = crate::auth_verify::handle(&req).await;
    assert!(result.is_ok(), "OAuth2 callback should be handled successfully");
    
    let response = result.unwrap();
    assert_eq!(response.status(), 200, "OAuth2 callback should return 200");
    
    Ok(())
}

#[tokio::test]
async fn test_openid_connect_userinfo() -> Result<()> {
    let mut headers = HashMap::new();
    headers.insert("authorization", "Bearer valid_access_token_123");
    
    let req = create_test_request_with_body(
        Method::GET,
        "/api/auth/userinfo",
        Some(headers),
        None
    );
    
    // Test userinfo endpoint
    let result = crate::auth_verify::handle(&req).await;
    assert!(result.is_ok(), "Userinfo endpoint should work with valid token");
    
    let response = result.unwrap();
    assert_eq!(response.status(), 200, "Userinfo should return 200 for valid token");
    
    Ok(())
}

#[tokio::test]
async fn test_protected_endpoint_requires_auth() -> Result<()> {
    // Test request to protected endpoint without auth
    let req = create_test_request_with_body(
        Method::POST,
        "/api/booking/create",
        None,
        Some(r#"{"guest_name":"John Doe"}"#)
    );
    
    let result = crate::compose_services(req).await;
    assert!(result.is_ok(), "Should not error, but should return 401");
    
    let response = result.unwrap();
    assert_eq!(response.status(), 401, "Should get 401 Unauthorized without auth");
    
    Ok(())
}

#[tokio::test]
async fn test_public_endpoint_no_auth_required() -> Result<()> {
    // Test request to public endpoint
    let req = create_test_request_with_body(
        Method::GET,
        "/api/reviews/list",
        None,
        None
    );
    
    let result = crate::compose_services(req).await;
    assert!(result.is_ok(), "Public endpoint should work without auth");
    
    let response = result.unwrap();
    assert_ne!(response.status(), 401, "Public endpoint should not require auth");
    
    Ok(())
}

#[tokio::test]
async fn test_cors_preflight_handling() -> Result<()> {
    let mut headers = HashMap::new();
    headers.insert("Access-Control-Request-Method", "POST");
    headers.insert("Access-Control-Request-Headers", "Content-Type, Authorization");
    
    let req = create_test_request_with_body(
        Method::OPTIONS,
        "/api/booking/create",
        Some(headers),
        None
    );
    
    // Test OPTIONS handling in main handler
    let result = crate::handle_request(req).await;
    assert!(result.is_ok(), "OPTIONS request should be handled");
    
    Ok(())
}

#[tokio::test]
async fn test_middleware_context_propagation() -> Result<()> {
    let mut headers = HashMap::new();
    headers.insert("authorization", "Bearer valid_access_token_123");
    headers.insert("x-forwarded-for", "192.168.1.100");
    
    let req = create_test_request_with_body(
        Method::POST,
        "/api/booking/create",
        Some(headers),
        Some(r#"{"guest_name":"John Doe"}"#)
    );
    
    // Test that context is properly created and propagated
    let mut context = crate::MiddlewareContext {
        client_id: crate::extract_client_id(&req),
        endpoint: req.uri().path().to_string(),
        method: req.method().as_str().to_string(),
        user_id: None,
        permissions: Vec::new(),
    };
    
    assert_eq!(context.client_id, "192.168.1.100");
    assert_eq!(context.endpoint, "/api/booking/create");
    assert_eq!(context.method, "POST");
    
    Ok(())
}

#[tokio::test]
async fn test_concurrent_request_handling() -> Result<()> {
    use tokio::task;
    
    // Simulate concurrent requests
    let tasks: Vec<_> = (0..10)
        .map(|i| {
            task::spawn(async move {
                let req = create_test_request_with_body(
                    Method::GET,
                    &format!("/api/reviews/list?page={}", i),
                    None,
                    None
                );
                
                // Test concurrent handling
                crate::compose_services(req).await.is_ok()
            })
        })
        .collect();
    
    // Wait for all requests to complete
    for task in tasks {
        let result = task.await?;
        assert!(result, "Concurrent request should be handled successfully");
    }
    
    Ok(())
}
