
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("POST", "/api/validation/upload") => handle_document_upload(req).await,
        ("GET", "/api/validation/status") => handle_validation_status(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Validation endpoint not found"
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

async fn handle_document_upload(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let upload_data: serde_json::Value = serde_json::from_str(body)?;
    
    let validation_result = serde_json::json!({
        "validation_id": format!("val_{}", uuid::Uuid::new_v4().simple()),
        "document_type": upload_data["document_type"],
        "status": "validated",
        "confidence": 95.5,
        "extracted_data": {
            "name": "John Doe",
            "document_number": "12345678A",
            "expiry_date": "2030-12-31"
        },
        "validated_at": chrono::Utc::now().to_rfc3339()
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(validation_result.to_string())
        .build())
}

async fn handle_validation_status(_req: &Request) -> Result<Response> {
    let status = serde_json::json!({
        "service": "validation",
        "status": "operational",
        "supported_documents": ["DNI", "NIE", "Passport", "EU ID Card"],
        "ocr_accuracy": 96.2
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(status.to_string())
        .build())
}
