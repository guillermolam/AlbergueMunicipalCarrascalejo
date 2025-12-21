use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{send, Request, Response};

pub async fn verify_token(req: &Request) -> Result<bool> {
    // Try to get token from Authorization header
    let token = if let Some(auth_header) = req.header("Authorization") {
        auth_header
            .as_str()
            .and_then(|s| s.strip_prefix("Bearer "))
            .map(|s| s.to_string())
    }
    // Fallback to cookie
    else if let Some(cookie_header) = req.header("Cookie") {
        cookie_header.as_str().and_then(|cookies| {
            cookies.split(';').find_map(|c| {
                let mut parts = c.trim().splitn(2, '=');
                if parts.next()? == "jwt" {
                    parts.next().map(|t| t.to_string())
                } else {
                    None
                }
            })
        })
    } else {
        None
    };

    let token = match token {
        Some(t) => t,
        None => return Ok(false),
    };

    // Create HTTP request using Spin's built-in HTTP client
    // Use relative path for Fermyon Cloud deployment
    let auth_req = Request::new(spin_sdk::http::Method::Get, "/auth/verify");

    match spin_sdk::http::send::<_, spin_sdk::http::Response>(auth_req).await {
        Ok(resp) => {
            // Check if response status is 2xx
            Ok((resp.status() / 100) == 2)
        }
        Err(_) => {
            eprintln!("Failed to verify token with auth service");
            Ok(false)
        }
    }
}

pub async fn handle(req: &Request) -> Result<Response> {
    let is_valid = verify_token(req).await?;

    if is_valid {
        let response_body = json!({
            "valid": true,
            "message": "Token is valid"
        })
        .to_string();

        return Ok(Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .body(response_body)
            .build());
    }

    let error_body = json!({
        "error": "Invalid or missing authentication token",
        "valid": false
    })
    .to_string();

    Ok(Response::builder()
        .status(401)
        .header("Content-Type", "application/json")
        .body(error_body)
        .build())
}
