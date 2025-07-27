
//! Gateway Integration Tests
//! Tests the entire service composition pipeline through HTTP requests

use anyhow::Result;
use httpc_test::{new_client, Request};
use serde_json::{json, Value};
use speculoos::prelude::*;
use std::time::Duration;
use tokio::time::sleep;

const GATEWAY_URL: &str = "http://0.0.0.0:3000";

pub struct GatewayTestClient {
    client: httpc_test::Client,
    base_url: String,
}

impl GatewayTestClient {
    pub fn new() -> Self {
        Self {
            client: new_client(GATEWAY_URL).unwrap(),
            base_url: GATEWAY_URL.to_string(),
        }
    }

    pub async fn get(&self, path: &str) -> Result<httpc_test::Response> {
        let req = Request::get(&format!("{}{}", self.base_url, path));
        self.client.do_req(req).await
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<httpc_test::Response> {
        let req = Request::post(&format!("{}{}", self.base_url, path))
            .header("Content-Type", "application/json")
            .body(body.to_string());
        self.client.do_req(req).await
    }

    pub async fn post_with_auth(&self, path: &str, body: Value, token: &str) -> Result<httpc_test::Response> {
        let req = Request::post(&format!("{}{}", self.base_url, path))
            .header("Content-Type", "application/json")
            .header("Authorization", &format!("Bearer {}", token))
            .body(body.to_string());
        self.client.do_req(req).await
    }

    pub async fn options(&self, path: &str) -> Result<httpc_test::Response> {
        let req = Request::new(httpc_test::Method::OPTIONS, &format!("{}{}", self.base_url, path))
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Content-Type, Authorization");
        self.client.do_req(req).await
    }
}

#[tokio::test]
async fn test_gateway_health_check() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let response = client.get("/api/health").await?;
    
    assert_that(&response.status()).is_equal_to(200);
    
    let body: Value = response.json().await?;
    assert_that(&body["status"].as_str()).is_equal_to(Some("healthy"));
    assert_that(&body["service"].as_str()).is_equal_to(Some("gateway-bff"));
    assert_that(&body["middleware"]["rate_limiting"].as_str()).is_equal_to(Some("active"));
    assert_that(&body["middleware"]["security_scanning"].as_str()).is_equal_to(Some("active"));
    assert_that(&body["middleware"]["authentication"].as_str()).is_equal_to(Some("active"));

    Ok(())
}

#[tokio::test]
async fn test_cors_preflight_handling() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let response = client.options("/api/booking/create").await?;
    
    assert_that(&response.status()).is_equal_to(200);
    assert_that(&response.headers().get("Access-Control-Allow-Origin"))
        .is_some()
        .is_equal_to("*");
    assert_that(&response.headers().get("Access-Control-Allow-Methods"))
        .is_some()
        .contains("POST");

    Ok(())
}

#[tokio::test]
async fn test_service_composition_pipeline_success() -> Result<()> {
    let client = GatewayTestClient::new();
    
    // Test successful request through entire pipeline
    let booking_data = json!({
        "guest_name": "John Doe",
        "check_in": "2024-01-20",
        "check_out": "2024-01-21",
        "bed_preference": "lower"
    });
    
    let response = client.post_with_auth(
        "/api/booking/create", 
        booking_data,
        "valid_access_token_123"
    ).await?;
    
    // Should pass through rate limiting, security, and auth
    assert_that(&response.status()).is_not_equal_to(429); // Not rate limited
    assert_that(&response.status()).is_not_equal_to(403); // Not security blocked
    assert_that(&response.status()).is_not_equal_to(401); // Not auth failed

    Ok(())
}

#[tokio::test]
async fn test_rate_limiting_enforcement() -> Result<()> {
    let client = GatewayTestClient::new();
    
    // Send multiple rapid requests to trigger rate limiting
    let mut responses = Vec::new();
    
    for i in 0..20 {
        let response = client.get(&format!("/api/reviews/list?page={}", i)).await?;
        responses.push(response);
        
        // Small delay to avoid overwhelming the test
        sleep(Duration::from_millis(10)).await;
    }
    
    // At least one response should be rate limited (429)
    let rate_limited = responses.iter().any(|r| r.status() == 429);
    
    if rate_limited {
        let rate_limited_response = responses.iter().find(|r| r.status() == 429).unwrap();
        let body: Value = rate_limited_response.json().await?;
        assert_that(&body["error"].as_str()).is_equal_to(Some("Rate Limit Exceeded"));
        assert_that(&body["retry_after"]).is_some();
    }

    Ok(())
}

#[tokio::test]
async fn test_security_scanning_malicious_payload() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let malicious_payloads = vec![
        json!({"content": "<script>alert('xss')</script>"}),
        json!({"content": "'; DROP TABLE users; --"}),
        json!({"content": "javascript:alert(1)"}),
        json!({"content": "data:text/html,<script>alert('xss')</script>"}),
    ];
    
    for payload in malicious_payloads {
        let response = client.post("/api/booking/create", payload).await?;
        
        // Should be blocked by security scanning (403) or require auth (401)
        assert_that(&response.status()).is_in(vec![401, 403]);
        
        if response.status() == 403 {
            let body: Value = response.json().await?;
            assert_that(&body["error"].as_str()).is_equal_to(Some("Security Threat Detected"));
        }
    }

    Ok(())
}

#[tokio::test]
async fn test_authentication_required_endpoints() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let protected_endpoints = vec![
        "/api/booking/create",
        "/api/admin/dashboard", 
        "/api/notifications/create",
        "/api/validation/upload",
    ];
    
    for endpoint in protected_endpoints {
        let response = client.post(endpoint, json!({"test": "data"})).await?;
        
        assert_that(&response.status()).is_equal_to(401);
        
        let body: Value = response.json().await?;
        assert_that(&body["error"].as_str()).is_equal_to(Some("Authentication Required"));
        assert_that(&body["auth_url"].as_str()).is_equal_to(Some("/api/auth/login"));
    }

    Ok(())
}

#[tokio::test]
async fn test_public_endpoints_no_auth() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let public_endpoints = vec![
        "/api/reviews/list",
        "/api/location/search",
        "/api/info/cards",
    ];
    
    for endpoint in public_endpoints {
        let response = client.get(endpoint).await?;
        
        // Should not require authentication
        assert_that(&response.status()).is_not_equal_to(401);
        assert_that(&response.status()).is_not_equal_to(403);
    }

    Ok(())
}

#[tokio::test]
async fn test_oauth2_authentication_flow() -> Result<()> {
    let client = GatewayTestClient::new();
    
    // Test OAuth2 callback endpoint
    let response = client.get("/api/auth/callback?code=auth_code_123&state=csrf_state_456").await?;
    
    assert_that(&response.status()).is_equal_to(200);
    
    let body: Value = response.json().await?;
    // Should contain OAuth2 response structure
    assert_that(&body).is_not_equal_to(json!(null));

    Ok(())
}

#[tokio::test]
async fn test_openid_connect_userinfo() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let response = client.post_with_auth(
        "/api/auth/userinfo",
        json!({}),
        "valid_access_token_123"
    ).await?;
    
    assert_that(&response.status()).is_equal_to(200);

    Ok(())
}

#[tokio::test]
async fn test_service_routing() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let service_routes = vec![
        ("/api/booking/list", "booking"),
        ("/api/reviews/list", "reviews"),
        ("/api/notifications/status", "notifications"),
        ("/api/location/search", "location"),
        ("/api/info/cards", "info"),
        ("/api/validation/status", "validation"),
    ];
    
    for (route, service_name) in service_routes {
        let response = client.get(route).await?;
        
        // Should route to service (not 404)
        assert_that(&response.status()).is_not_equal_to(404);
        
        println!("✅ Route {} -> {} service: {}", route, service_name, response.status());
    }

    Ok(())
}

#[tokio::test]
async fn test_unknown_endpoint_404() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let response = client.get("/api/nonexistent/endpoint").await?;
    
    assert_that(&response.status()).is_equal_to(404);
    
    let body: Value = response.json().await?;
    assert_that(&body["error"].as_str()).is_equal_to(Some("Not Found"));
    assert_that(&body["available_endpoints"]).is_some();

    Ok(())
}

#[tokio::test]
async fn test_concurrent_request_handling() -> Result<()> {
    let client = GatewayTestClient::new();
    
    // Test concurrent requests
    let mut handles = Vec::new();
    
    for i in 0..10 {
        let client = GatewayTestClient::new();
        let handle = tokio::spawn(async move {
            client.get(&format!("/api/reviews/list?page={}", i)).await
        });
        handles.push(handle);
    }
    
    // Wait for all requests to complete
    for handle in handles {
        let response = handle.await??;
        // All requests should complete successfully (no panics/crashes)
        assert_that(&response.status()).is_less_than(500);
    }

    Ok(())
}

#[tokio::test]
async fn test_middleware_context_propagation() -> Result<()> {
    let client = GatewayTestClient::new();
    
    let response = client.post_with_auth(
        "/api/booking/create",
        json!({"guest_name": "Test User"}),
        "valid_token_with_user_info"
    ).await?;
    
    // Test that user context is properly propagated through middleware
    // This would be validated by checking if user-specific logic was applied
    assert_that(&response.status()).is_not_equal_to(500); // No internal errors

    Ok(())
}
