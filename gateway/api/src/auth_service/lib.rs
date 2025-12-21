use anyhow::Result;
use serde_json::{json, Value};
use spin_sdk::http::{Request, Response};

use crate::backend_client::{self, AuthResponse};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", "/api/auth/login") => {
            // Redirect to backend auth service
            let auth_url = "http://localhost:3000/login";

            Ok(Response::builder()
                .status(302)
                .header("Location", auth_url)
                .body("".to_string())
                .build())
        }
        ("GET", path) if path.starts_with("/api/auth/callback") => {
            // Extract code and state from query params
            let query = req.uri().query().unwrap_or_default();
            let callback_url = format!("/api/auth/callback?{}", query);

            // Forward to backend auth service
            let backend_url = format!("http://localhost:3000{}", callback_url);
            let response = spin_sdk::http::send(Request::get(&backend_url)).await?;

            // Parse the response from the backend
            let auth_response: AuthResponse =
                serde_json::from_slice(response.body().as_deref().unwrap_or_default())?;

            // Create a response with the JWT in a secure HTTP-only cookie
            let response_body = json!({
                "access_token": auth_response.jwt,
                "token_type": "Bearer",
                "expires_in": 3600,
                "refresh_token": auth_response.refresh_token
            })
            .to_string();

            let mut response = Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)?;

            // Set secure, HttpOnly cookie
            response.headers_mut().insert(
                "Set-Cookie",
                format!(
                    "jwt={}; HttpOnly; Path=/; Secure; SameSite=Strict",
                    auth_response.jwt
                )
                .parse()?,
            );

            Ok(response)
        }
        ("POST", "/api/auth/refresh") => {
            // Extract refresh token from request
            let body: Value = serde_json::from_slice(req.body().as_deref().unwrap_or_default())?;
            let refresh_token = body
                .get("refresh_token")
                .and_then(|t| t.as_str())
                .ok_or_else(|| anyhow::anyhow!("Missing refresh_token"))?;

            // Forward to backend auth service
            let backend_url = "http://localhost:3000/refresh";
            let req = spin_sdk::http::Request::post(
                backend_url,
                &json!({ "refresh_token": refresh_token }),
            );
            let response = spin_sdk::http::send(req).await?;

            // Return the response from the backend
            Ok(response)
        }
        ("POST", "/api/auth/logout") => {
            // Clear the JWT cookie
            let mut response = Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(json!({ "success": true }).to_string())?;

            response.headers_mut().insert(
                "Set-Cookie",
                "jwt=; HttpOnly; Path=/; Secure; SameSite=Strict; Max-Age=0".parse()?,
            );

            Ok(response)
        }
        _ => {
            let error_body = json!({
                "error": "Not Found",
                "message": "Auth endpoint not found"
            })
            .to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}
