use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    // Mock auth verification - in real implementation, this would validate JWT tokens
    let auth_header = req.headers().get("authorization");

    if let Some(auth_value) = auth_header {
        if let Ok(auth_str) = auth_value.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];

                // Mock validation - accept tokens that contain "valid"
                if token.contains("valid") {
                    let response_body = serde_json::json!({
                        "user_id": "user_123",
                        "permissions": ["read", "write"],
                        "valid": true
                    }).to_string();

                    return Ok(Response::builder()
                        .status(200)
                        .header("Content-Type", "application/json")
                        .body(response_body)
                        .build());
                }
            }
        }
    }

    let error_body = serde_json::json!({
        "error": "Invalid or missing authentication token"
    }).to_string();

    Ok(Response::builder()
        .status(401)
        .header("Content-Type", "application/json")
        .body(error_body)
        .build())
}