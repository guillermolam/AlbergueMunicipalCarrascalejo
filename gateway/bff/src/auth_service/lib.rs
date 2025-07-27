use anyhow::Result;
use spin_sdk::http::{Request, Response};
use crate::build_response_with_cors;

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/auth/login" => {
            let response_body = serde_json::json!({
                "login_url": "https://dev-auth0.auth0.com/authorize?client_id=test&redirect_uri=callback",
                "status": "redirect"
            });
            Ok(build_response_with_cors(200, "application/json", response_body.to_string()))
        }
        "/api/auth/callback" => {
            let response_body = serde_json::json!({
                "access_token": "mock_access_token_123",
                "user_id": "user_123",
                "status": "authenticated"
            });
            Ok(build_response_with_cors(200, "application/json", response_body.to_string()))
        }
        "/api/auth/userinfo" => {
            let response_body = serde_json::json!({
                "user_id": "user_123",
                "email": "test@example.com",
                "permissions": ["read", "write"]
            });
            Ok(build_response_with_cors(200, "application/json", response_body.to_string()))
        }
        _ => {
            let error_body = serde_json::json!({
                "error": "Auth endpoint not found"
            });
            Ok(build_response_with_cors(404, "application/json", error_body.to_string()))
        }
    }
}