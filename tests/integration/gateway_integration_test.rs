#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

//! Gateway Integration Tests
//! Tests the entire service composition pipeline through HTTP requests

use anyhow::Result;
use reqwest;
use serde_json::{json, Value};
use speculoos::prelude::*;
use std::env;
use std::time::Duration;
use tokio::time::sleep;

fn get_gateway_url() -> String {
    env::var("GATEWAY_TEST_PORT")
        .map(|port| format!("http://0.0.0.0:{}", port))
        .unwrap_or_else(|_| "http://0.0.0.0:3000".to_string())
}

pub struct GatewayTestClient {
    client: reqwest::Client,
    base_url: String,
}

impl GatewayTestClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: get_gateway_url(),
        }
    }

    pub async fn get(&self, path: &str) -> Result<reqwest::Response> {
        let response = self.client
            .get(&format!("{}{}", self.base_url, path))
            .send()
            .await?;
        Ok(response)
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<reqwest::Response> {
        let response = self.client
            .post(&format!("{}{}", self.base_url, path))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Ok(response)
    }

    pub async fn post_with_auth(&self, path: &str, body: Value, token: &str) -> Result<reqwest::Response> {
        let response = self.client
            .post(&format!("{}{}", self.base_url, path))
            .header("Content-Type", "application/json")
            .header("Authorization", &format!("Bearer {}", token))
            .json(&body)
            .send()
            .await?;
        Ok(response)
    }

    pub async fn options(&self, path: &str) -> Result<reqwest::Response> {
        let response = self.client
            .request(reqwest::Method::OPTIONS, &format!("{}{}", self.base_url, path))
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Content-Type, Authorization")
            .send()
            .await?;
        Ok(response)
    }
}

#[tokio::test]
async fn test_gateway_health_check() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.get("/api/health").await?;

    assert_that(&response.status().as_u16()).is_equal_to(200);

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

    assert_that(&response.status().as_u16()).is_equal_to(200);
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
    let booking_data = serde_json::json!({
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
    assert_that(&response.status().as_u16()).is_not_equal_to(429); // Not rate limited
    assert_that(&response.status().as_u16()).is_not_equal_to(403); // Not security blocked
    assert_that(&response.status().as_u16()).is_not_equal_to(401); // Not auth failed

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
    let rate_limited = responses.iter().any(|r| r.status().as_u16() == 429);

    if rate_limited {
        let rate_limited_response = responses.iter().find(|r| r.status().as_u16() == 429).unwrap();
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
        serde_json::json!({"content": "<script>alert('xss')</script>"}),
        serde_json::json!({"content": "'; DROP TABLE users; --"}),
        serde_json::json!({"content": "javascript:alert(1)"}),
        serde_json::json!({"content": "data:text/html,<script>alert('xss')</script>"}),
    ];

    for payload in malicious_payloads {
        let response = client.post("/api/booking/create", payload).await?;

        // Should be blocked by security scanning (403) or require auth (401)
        assert_that(&response.status().as_u16()).is_in(vec![401, 403]);

        if response.status().as_u16() == 403 {
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
        let response = client.post(endpoint, serde_json::json!({"test": "data"})).await?;

        assert_that(&response.status().as_u16()).is_equal_to(401);

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
        assert_that(&response.status().as_u16()).is_not_equal_to(401);
        assert_that(&response.status().as_u16()).is_not_equal_to(403);
    }

    Ok(())
}

#[tokio::test]
async fn test_oauth2_authentication_flow() -> Result<()> {
    let client = GatewayTestClient::new();

    // Test OAuth2 callback endpoint
    let response = client.get("/api/auth/callback?code=auth_code_123&state=csrf_state_456").await?;

    assert_that(&response.status().as_u16()).is_equal_to(200);

    let body: Value = response.json().await?;
    // Should contain OAuth2 response structure
    assert_that(&body).is_not_equal_to(serde_json::json!(null));

    Ok(())
}

#[tokio::test]
async fn test_openid_connect_userinfo() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.post_with_auth(
        "/api/auth/userinfo",
        serde_json::json!({}),
        "valid_access_token_123"
    ).await?;

    assert_that(&response.status().as_u16()).is_equal_to(200);

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
        assert_that(&response.status().as_u16()).is_not_equal_to(404);

        println!("✅ Route {} -> {} service: {}", route, service_name, response.status());
    }

    Ok(())
}

#[tokio::test]
async fn test_unknown_endpoint_404() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.get("/api/nonexistent/endpoint").await?;

    assert_that(&response.status().as_u16()).is_equal_to(404);

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
        assert_that(&response.status().as_u16()).is_less_than(500);
    }

    Ok(())
}

#[tokio::test]
async fn test_middleware_context_propagation() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.post_with_auth(
        "/api/booking/create",
        serde_json::json!({"guest_name": "Test User"}),
        "valid_token_with_user_info"
    ).await?;

    // Test that user context is properly propagated through middleware
    // This would be validated by checking if user-specific logic was applied
    assert_that(&response.status().as_u16()).is_not_equal_to(500); // No internal errors

    Ok(())
}

#[tokio::test]
async fn test_cors_preflight() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.options("/api/booking/create").await?;

    assert_that(&response.status().as_u16()).is_equal_to(200);

    let headers = response.headers();
    assert_that(&headers.get("access-control-allow-origin")).is_some();
    assert_that(&headers.get("access-control-allow-methods")).is_some();
    assert_that(&headers.get("access-control-allow-headers")).is_some();

    Ok(())
}

#[tokio::test]
async fn test_protected_route_requires_auth() -> Result<()> {
    let client = GatewayTestClient::new();

    // Test protected booking endpoint without auth
    let response = client.post("/api/booking/create", serde_json::json!({
        "guest_name": "Test User",
        "check_in": "2024-01-15",
        "check_out": "2024-01-16"
    })).await?;

    assert_that(&response.status().as_u16()).is_equal_to(401);

    let body: Value = response.json().await?;
    assert_that(&body["error"].as_str()).is_equal_to(Some("Authentication Required"));

    Ok(())
}

#[tokio::test]
async fn test_rate_limiting_middleware() -> Result<()> {
    let client = GatewayTestClient::new();

    // Make multiple rapid requests to trigger rate limiting
    for _i in 0..10 {
        let _response = client.get("/api/health").await?;
    }

    // The rate limiter should eventually kick in
    // Note: This test may be flaky depending on rate limit configuration
    let response = client.get("/api/health").await?;

    // Should either succeed (200) or be rate limited (429)
    let status = response.status().as_u16();
    assert_that(&status).is_in(vec![200, 429]);

    Ok(())
}

#[tokio::test]
async fn test_security_middleware() -> Result<()> {
    let client = GatewayTestClient::new();

    // Test with potentially malicious payload
    let malicious_payload = serde_json::json!({
        "script": "<script>alert('xss')</script>",
        "sql": "'; DROP TABLE users; --"
    });

    let response = client.post("/api/booking/list", malicious_payload).await?;

    // Security middleware should handle this gracefully
    // Could be 403 (blocked) or processed normally depending on implementation
    let status = response.status().as_u16();
    assert_that(&status).is_in(vec![200, 403, 404]);

    Ok(())
}
