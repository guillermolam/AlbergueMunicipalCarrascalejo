use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/validation/document" => handle_document_validation(req).await,
        "/api/validation/form" => handle_form_validation(req).await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Validation endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_document_validation(_req: &Request) -> Result<Response> {
    // TODO: Implement document validation logic
    Ok(Response::builder()
        .status(501)
        .header("Content-Type", "application/json")
        .body(json!({"error": "Not implemented yet"}).to_string())
        .build())
}

async fn handle_form_validation(_req: &Request) -> Result<Response> {
    // TODO: Implement form validation logic
    Ok(Response::builder()
        .status(501)
        .header("Content-Type", "application/json")
        .body(json!({"error": "Not implemented yet"}).to_string())
        .build())
}