
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("POST", "/api/auth/login") => handle_login(req).await,
        ("POST", "/api/auth/logout") => handle_logout(req).await,
        ("GET", "/api/auth/callback") => crate::auth_verify::handle(req).await,
        ("POST", "/api/auth/verify") => crate::auth_verify::handle(req).await,
        ("GET", "/api/auth/userinfo") => crate::auth_verify::handle(req).await,
        ("POST", "/api/auth/refresh") => crate::auth_verify::handle(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Auth endpoint not found"
            });
            
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(error_body.to_string())
                .build())
        }
    }
}

async fn handle_login(_req: &Request) -> Result<Response> {
    let login_response = serde_json::json!({
        "login_url": "https://albergue.eu.auth0.com/authorize?response_type=code&client_id=your_client_id&redirect_uri=https://your-domain.com/api/auth/callback&scope=openid%20profile%20email",
        "state": "csrf_protection_state"
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(login_response.to_string())
        .build())
}

async fn handle_logout(_req: &Request) -> Result<Response> {
    let logout_response = serde_json::json!({
        "logout_url": "https://albergue.eu.auth0.com/v2/logout?returnTo=https://your-domain.com",
        "status": "logged_out"
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(logout_response.to_string())
        .build())
}
