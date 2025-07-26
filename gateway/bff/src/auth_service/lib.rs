use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/auth/user" => handle_user_info(req).await,
        "/api/auth/permissions" => handle_permissions(req).await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Auth service endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_user_info(_req: &Request) -> Result<Response> {
    // TODO: Extract user info from JWT token
    let user = json!({
        "id": "demo-user",
        "email": "demo@example.com",
        "name": "Demo User",
        "roles": ["user"]
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(user.to_string())
        .build())
}

async fn handle_permissions(_req: &Request) -> Result<Response> {
    let permissions = json!({
        "can_book": true,
        "can_cancel": true,
        "can_modify": true
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(permissions.to_string())
        .build())
}