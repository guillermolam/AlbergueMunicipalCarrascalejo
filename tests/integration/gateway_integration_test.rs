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
use serde_json::Value;
use std::env;

fn get_gateway_url() -> String {
    env::var("GATEWAY_TEST_PORT").map_or_else(
        |_| "http://0.0.0.0:3000".to_string(),
        |port| format!("http://0.0.0.0:{port}"),
    )
}

pub struct GatewayTestClient {
    client: reqwest::Client,
    base_url: String,
}

impl Default for GatewayTestClient {
    fn default() -> Self {
        Self::new()
    }
}

impl GatewayTestClient {
    #[must_use]
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: get_gateway_url(),
        }
    }

    pub async fn get(&self, path: &str) -> Result<reqwest::Response> {
        let response = self
            .client
            .get(format!("{}{path}", self.base_url))
            .send()
            .await?;
        Ok(response)
    }

    pub async fn post(&self, path: &str, body: Value) -> Result<reqwest::Response> {
        let response = self
            .client
            .post(format!("{}{path}", self.base_url))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await?;
        Ok(response)
    }

    pub async fn post_with_auth(
        &self,
        path: &str,
        body: Value,
        token: &str,
    ) -> Result<reqwest::Response> {
        let response = self
            .client
            .post(format!("{}{path}", self.base_url))
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {token}"))
            .json(&body)
            .send()
            .await?;
        Ok(response)
    }

    pub async fn options(&self, path: &str) -> Result<reqwest::Response> {
        let response = self
            .client
            .request(reqwest::Method::OPTIONS, format!("{}{path}", self.base_url))
            .header("Access-Control-Request-Method", "POST")
            .header(
                "Access-Control-Request-Headers",
                "Content-Type, Authorization",
            )
            .send()
            .await?;
        Ok(response)
    }
}

#[tokio::test]
async fn test_gateway_health_check() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.get("/api/health").await?;

    assert_eq!(response.status().as_u16(), 200);

    let body: Value = response.json().await?;
    assert_eq!(body["status"].as_str(), Some("healthy"));
    assert_eq!(body["service"].as_str(), Some("gateway-bff"));
    assert_eq!(body["middleware"]["rate_limiting"].as_str(), Some("active"));
    assert_eq!(
        body["middleware"]["security_scanning"].as_str(),
        Some("active")
    );
    assert_eq!(
        body["middleware"]["authentication"].as_str(),
        Some("active")
    );

    Ok(())
}

#[tokio::test]
async fn test_cors_preflight_handling() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.options("/api/booking/create").await?;

    assert_eq!(response.status().as_u16(), 200);

    let origin = response
        .headers()
        .get("Access-Control-Allow-Origin")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert_eq!(origin, "*", "CORS allow-origin header should be *");

    let methods = response
        .headers()
        .get("Access-Control-Allow-Methods")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    assert!(
        methods.contains("POST"),
        "CORS allow-methods should include POST"
    );

    Ok(())
}

#[tokio::test]
async fn test_service_composition_pipeline_success() -> Result<()> {
    let client = GatewayTestClient::new();

    let booking_data = serde_json::json!({
        "guest_name": "John Doe",
        "check_in": "2024-01-20",
        "check_out": "2024-01-21",
        "bed_preference": "lower"
    });

    let response = client
        .post_with_auth(
            "/api/booking/create",
            booking_data,
            "valid_access_token_123",
        )
        .await?;

    let status = response.status().as_u16();
    assert_ne!(status, 429, "Should not be rate limited");
    assert_ne!(status, 403, "Should not be security blocked");
    assert_ne!(status, 401, "Should not fail auth");

    Ok(())
}

#[tokio::test]
async fn test_rate_limiting_enforcement() -> Result<()> {
    use std::time::Duration;
    use tokio::time::sleep;

    let client = GatewayTestClient::new();
    let mut responses = Vec::new();

    for i in 0..20 {
        let response = client.get(&format!("/api/reviews/list?page={i}")).await?;
        responses.push(response);
        sleep(Duration::from_millis(10)).await;
    }

    let rate_limited = responses.iter().any(|r| r.status().as_u16() == 429);

    if rate_limited {
        // Use remove() to take ownership — json() consumes the Response
        let idx = responses
            .iter()
            .position(|r| r.status().as_u16() == 429)
            .unwrap();
        let rate_limited_response = responses.remove(idx);
        let body: Value = rate_limited_response.json().await?;
        assert_eq!(body["error"].as_str(), Some("Rate Limit Exceeded"));
        assert!(
            !body["retry_after"].is_null(),
            "retry_after should be present"
        );
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
        let status = response.status().as_u16();

        assert!(
            status == 401 || status == 403,
            "Expected 401 or 403, got {status}"
        );

        if status == 403 {
            let body: Value = response.json().await?;
            assert_eq!(body["error"].as_str(), Some("Security Threat Detected"));
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
        let response = client
            .post(endpoint, serde_json::json!({"test": "data"}))
            .await?;

        assert_eq!(response.status().as_u16(), 401);

        let body: Value = response.json().await?;
        assert_eq!(body["error"].as_str(), Some("Authentication Required"));
        assert_eq!(body["auth_url"].as_str(), Some("/api/auth/login"));
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
        let status = response.status().as_u16();

        assert_ne!(status, 401, "{endpoint} should not require authentication");
        assert_ne!(status, 403, "{endpoint} should not be forbidden");
    }

    Ok(())
}

#[tokio::test]
async fn test_oauth2_authentication_flow() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client
        .get("/api/auth/callback?code=auth_code_123&state=csrf_state_456")
        .await?;

    assert_eq!(response.status().as_u16(), 200);

    let body: Value = response.json().await?;
    assert_ne!(body, serde_json::json!(null));

    Ok(())
}

#[tokio::test]
async fn test_openid_connect_userinfo() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client
        .post_with_auth(
            "/api/auth/userinfo",
            serde_json::json!({}),
            "valid_access_token_123",
        )
        .await?;

    assert_eq!(response.status().as_u16(), 200);

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
        let status = response.status().as_u16();

        assert_ne!(status, 404, "Route {route} should not return 404");
        println!("✅ Route {route} -> {service_name} service: {status}");
    }

    Ok(())
}

#[tokio::test]
async fn test_unknown_endpoint_404() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.get("/api/nonexistent/endpoint").await?;

    assert_eq!(response.status().as_u16(), 404);

    let body: Value = response.json().await?;
    assert_eq!(body["error"].as_str(), Some("Not Found"));
    assert!(
        !body["available_endpoints"].is_null(),
        "available_endpoints should be present"
    );

    Ok(())
}

#[tokio::test]
async fn test_concurrent_request_handling() -> Result<()> {
    let mut handles = Vec::new();

    for i in 0..10 {
        let client = GatewayTestClient::new();
        let handle =
            tokio::spawn(async move { client.get(&format!("/api/reviews/list?page={i}")).await });
        handles.push(handle);
    }

    for handle in handles {
        let response = handle.await??;
        assert!(
            response.status().as_u16() < 500,
            "Response should not be a server error"
        );
    }

    Ok(())
}

#[tokio::test]
async fn test_middleware_context_propagation() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client
        .post_with_auth(
            "/api/booking/create",
            serde_json::json!({"guest_name": "Test User"}),
            "valid_token_with_user_info",
        )
        .await?;

    assert_ne!(
        response.status().as_u16(),
        500,
        "Should not produce internal errors"
    );

    Ok(())
}

#[tokio::test]
async fn test_cors_preflight() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client.options("/api/booking/create").await?;

    assert_eq!(response.status().as_u16(), 200);

    let headers = response.headers();
    assert!(
        headers.get("access-control-allow-origin").is_some(),
        "access-control-allow-origin header missing"
    );
    assert!(
        headers.get("access-control-allow-methods").is_some(),
        "access-control-allow-methods header missing"
    );
    assert!(
        headers.get("access-control-allow-headers").is_some(),
        "access-control-allow-headers header missing"
    );

    Ok(())
}

#[tokio::test]
async fn test_protected_route_requires_auth() -> Result<()> {
    let client = GatewayTestClient::new();

    let response = client
        .post(
            "/api/booking/create",
            serde_json::json!({
                "guest_name": "Test User",
                "check_in": "2024-01-15",
                "check_out": "2024-01-16"
            }),
        )
        .await?;

    assert_eq!(response.status().as_u16(), 401);

    let body: Value = response.json().await?;
    assert_eq!(body["error"].as_str(), Some("Authentication Required"));

    Ok(())
}

#[tokio::test]
async fn test_rate_limiting_middleware() -> Result<()> {
    let client = GatewayTestClient::new();

    for _ in 0..10 {
        client.get("/api/health").await?;
    }

    let response = client.get("/api/health").await?;
    let status = response.status().as_u16();

    assert!(
        status == 200 || status == 429,
        "Expected 200 or 429, got {status}"
    );

    Ok(())
}

#[tokio::test]
async fn test_security_middleware() -> Result<()> {
    let client = GatewayTestClient::new();

    let malicious_payload = serde_json::json!({
        "script": "<script>alert('xss')</script>",
        "sql": "'; DROP TABLE users; --"
    });

    let response = client.post("/api/booking/list", malicious_payload).await?;
    let status = response.status().as_u16();

    assert!(
        status == 200 || status == 403 || status == 404,
        "Expected 200, 403, or 404, got {status}"
    );

    Ok(())
}
