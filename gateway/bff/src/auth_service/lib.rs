
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("POST", "/api/auth/login") => {
            let response_body = serde_json::json!({
                "access_token": "mock_access_token_123",
                "token_type": "Bearer",
                "expires_in": 3600,
                "user": {
                    "id": "user_123",
                    "email": "test@example.com"
                }
            }).to_string();
            
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        ("GET", "/api/auth/callback") => {
            let response_body = serde_json::json!({
                "status": "success",
                "message": "OAuth callback processed successfully"
            }).to_string();
            
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        ("POST", "/api/auth/userinfo") => {
            let response_body = serde_json::json!({
                "sub": "user_123",
                "email": "test@example.com",
                "name": "Test User"
            }).to_string();
            
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Auth endpoint not found"
            }).to_string();
            
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}
