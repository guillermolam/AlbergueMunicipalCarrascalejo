use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", "/api/validation/status") => {
            let response_body = serde_json::json!({
                "status": "ready",
                "supported_documents": ["DNI", "NIE", "Passport"]
            }).to_string();

            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        ("POST", "/api/validation/upload") => {
            let response_body = serde_json::json!({
                "id": "validation_123",
                "status": "processing",
                "message": "Document uploaded successfully"
            }).to_string();

            Ok(Response::builder()
                .status(201)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Validation endpoint not found"
            }).to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}