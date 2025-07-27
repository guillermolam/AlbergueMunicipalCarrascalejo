
use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Method};
use std::collections::HashMap;

// Import the functions we want to test
use crate::*;

#[tokio::test]
async fn test_extract_client_id() -> Result<()> {
    // Test client ID extraction from various headers
    let mut headers = HashMap::new();
    headers.insert("x-forwarded-for", "192.168.1.100");
    
    let req = Request::builder()
        .method(Method::GET)
        .uri("/test")
        .header("x-forwarded-for", "192.168.1.100")
        .body(vec![])
        .unwrap();
    
    let client_id = extract_client_id(&req);
    assert_eq!(client_id, "192.168.1.100");
    
    // Test with x-real-ip header
    let req2 = Request::builder()
        .method(Method::GET)
        .uri("/test")
        .header("x-real-ip", "10.0.0.1")
        .body(vec![])
        .unwrap();
    
    let client_id2 = extract_client_id(&req2);
    assert_eq!(client_id2, "10.0.0.1");
    
    // Test fallback to "unknown"
    let req3 = Request::builder()
        .method(Method::GET)
        .uri("/test")
        .body(vec![])
        .unwrap();
    
    let client_id3 = extract_client_id(&req3);
    assert_eq!(client_id3, "unknown");
    
    Ok(())
}

#[tokio::test]
async fn test_requires_authentication() -> Result<()> {
    // Test authentication requirement detection
    let protected_paths = vec![
        "/api/booking/create",
        "/api/admin/dashboard",
        "/api/notifications/create",
        "/api/validation/upload",
    ];
    
    let public_paths = vec![
        "/api/health",
        "/api/reviews/list",
        "/api/location/info",
        "/api/info/cards",
        "/api/auth/login",
    ];
    
    for path in protected_paths {
        assert!(requires_authentication(path), "Path {} should require authentication", path);
    }
    
    for path in public_paths {
        assert!(!requires_authentication(path), "Path {} should not require authentication", path);
    }
    
    Ok(())
}

#[tokio::test]
async fn test_cors_headers_creation() -> Result<()> {
    // Test CORS headers are properly created
    let headers = create_cors_headers();
    
    assert_eq!(headers.len(), 4);
    assert!(headers.contains(&("Access-Control-Allow-Origin", "*")));
    assert!(headers.contains(&("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")));
    assert!(headers.contains(&("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")));
    assert!(headers.contains(&("Access-Control-Expose-Headers", "X-RateLimit-Remaining, X-RateLimit-Reset")));
    
    Ok(())
}

#[tokio::test]
async fn test_bearer_token_extraction() -> Result<()> {
    use crate::auth_verify::extract_bearer_token;
    
    // Test bearer token extraction from Authorization header
    let test_cases = vec![
        ("Bearer valid_token_123", Some("valid_token_123".to_string())),
        ("bearer invalid_format", None),
        ("Basic dXNlcjpwYXNz", None),
        ("", None),
    ];
    
    for (header_value, expected) in test_cases {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/test")
            .header("authorization", header_value)
            .body(vec![])
            .unwrap();
        
        let result = extract_bearer_token(&req);
        assert_eq!(result, expected, "Failed for header value: {}", header_value);
    }
    
    Ok(())
}

#[tokio::test]
async fn test_oauth2_token_validation() -> Result<()> {
    use crate::auth_verify::validate_oauth2_token;
    
    // Test OAuth2 token validation logic
    let valid_tokens = vec![
        "valid_access_token_123",
        "valid_id_token_456",
        "valid_refresh_token_789",
    ];
    
    let invalid_tokens = vec![
        "invalid_token",
        "expired_token",
        "",
    ];
    
    for token in valid_tokens {
        let result = validate_oauth2_token(token, "access_token").await?;
        assert!(result.valid, "Token {} should be valid", token);
        assert!(result.user_id.is_some());
        assert!(!result.permissions.is_empty());
    }
    
    for token in invalid_tokens {
        let result = validate_oauth2_token(token, "access_token").await?;
        assert!(!result.valid, "Token {} should be invalid", token);
        assert!(result.user_id.is_none());
        assert!(result.permissions.is_empty());
    }
    
    Ok(())
}

#[tokio::test]
async fn test_query_parameter_extraction() -> Result<()> {
    use crate::auth_verify::extract_query_params;
    
    // Test query parameter parsing
    let test_cases = vec![
        ("http://example.com?code=123&state=456", vec![("code", "123"), ("state", "456")]),
        ("http://example.com?redirect_uri=https%3A//example.com", vec![("redirect_uri", "https://example.com")]),
        ("http://example.com", vec![]),
    ];
    
    for (url_str, expected_params) in test_cases {
        let req = Request::builder()
            .method(Method::GET)
            .uri(url_str)
            .body(vec![])
            .unwrap();
        
        let params = extract_query_params(&req);
        
        for (key, value) in expected_params {
            assert_eq!(params.get(key), Some(&value.to_string()), 
                      "Failed to extract {}={} from {}", key, value, url_str);
        }
    }
    
    Ok(())
}

#[tokio::test]
async fn test_middleware_context_creation() -> Result<()> {
    // Test MiddlewareContext creation and updates
    let context = MiddlewareContext {
        client_id: "192.168.1.100".to_string(),
        endpoint: "/api/booking/create".to_string(),
        method: "POST".to_string(),
        user_id: Some("user_123".to_string()),
        permissions: vec!["booking:write".to_string()],
    };
    
    assert_eq!(context.client_id, "192.168.1.100");
    assert_eq!(context.endpoint, "/api/booking/create");
    assert_eq!(context.method, "POST");
    assert!(context.user_id.is_some());
    assert_eq!(context.permissions.len(), 1);
    assert_eq!(context.permissions[0], "booking:write");
    
    Ok(())
}

#[tokio::test]
async fn test_response_building_with_cors() -> Result<()> {
    // Test response building with CORS headers
    let response_data = json!({
        "status": "success",
        "data": {"id": 123}
    });
    
    let response = build_response_with_cors(200, "application/json", response_data.to_string());
    
    assert_eq!(response.status(), 200);
    assert_eq!(response.headers().get("content-type").unwrap().to_str().unwrap(), "application/json");
    assert_eq!(response.headers().get("access-control-allow-origin").unwrap().to_str().unwrap(), "*");
    assert!(response.headers().get("access-control-allow-methods").is_some());
    assert!(response.headers().get("access-control-allow-headers").is_some());
    
    Ok(())
}
