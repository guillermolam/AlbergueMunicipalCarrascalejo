use anyhow::Result;
use worker::Response;

pub async fn verify_token(req: &worker::Request) -> Result<bool> {
    // Try to get token from Authorization header
    let token = if let Ok(Some(auth_header)) = req.headers().get("Authorization") {
        auth_header
            .strip_prefix("Bearer ")
            .map(|s| s.to_string())
    }
    // Fallback to cookie
    else if let Ok(Some(cookie_header)) = req.headers().get("Cookie") {
        cookie_header.split(';').find_map(|c| {
            let mut parts = c.trim().splitn(2, '=');
            if parts.next()? == "jwt" {
                parts.next().map(|t| t.to_string())
            } else {
                None
            }
        })
    } else {
        None
    };

    let _token = match token {
        Some(t) => t,
        None => return Ok(false),
    };

    // In Cloudflare Workers, auth verification would use service bindings
    // or Fetch to call the auth service worker
    // For now, log the attempt
    log::info!("Token verification requested");
    Ok(false)
}

#[allow(dead_code)]
pub async fn handle(req: &worker::Request) -> Result<Response> {
    let is_valid = verify_token(req).await?;

    if is_valid {
        let response_body = serde_json::json!({
            "valid": true,
            "message": "Token is valid"
        })
        .to_string();

        return Ok(Response::ok(response_body)?.with_status(200));
    }

    let error_body = serde_json::json!({
        "error": "Invalid or missing authentication token",
        "valid": false
    })
    .to_string();

    Ok(Response::ok(error_body)?.with_status(401))
}
