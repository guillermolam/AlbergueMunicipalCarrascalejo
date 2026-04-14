//! Tesseract-powered OCR service — native Axum HTTP server.
//!
//! Replaces the former Cloudflare Worker implementation with a standard Rust
//! binary that runs locally (and can be deployed to any Linux host).
//!
//! API surface (identical to the CF Worker contract):
//!   GET  /health          → { service, status }
//!   POST /ocr             → multipart: front (required), back (optional), docType
//!                        ← OcrResponse JSON
//!   POST /ocr/json        → JSON: { front_b64, back_b64?, docType }
//!                        ← OcrResponse JSON  (used by CF Worker adapter)

// Re-use modules defined in lib.rs
use ocr_service::models;
use ocr_service::ocr;
use ocr_service::parser;

use std::net::SocketAddr;

use anyhow::Result;
use axum::{
    extract::Multipart,
    http::{HeaderValue, Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use base64::Engine as _;
use serde::Deserialize;
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use uuid::Uuid;

use models::{DocumentType, ExtractedData, OcrResponse};

/// Maximum accepted image size (10 MiB).  Rejects oversized uploads before
/// allocating memory for Tesseract, preventing OOM / denial-of-service.
const MAX_IMAGE_BYTES: usize = 10 * 1024 * 1024;

// ── Health endpoint ───────────────────────────────────────────────────────────

async fn health() -> impl IntoResponse {
    Json(json!({ "service": "albergue-ocr", "status": "ok", "engine": "tesseract" }))
}

// ── OCR endpoint ──────────────────────────────────────────────────────────────

async fn handle_ocr(mut multipart: Multipart) -> impl IntoResponse {
    let mut front_bytes: Option<Vec<u8>> = None;
    let mut back_bytes: Option<Vec<u8>> = None;
    let mut doc_type_str = String::from("DNI");

    // Parse multipart fields
    while let Ok(Some(field)) = multipart.next_field().await {
        match field.name() {
            Some("docType") => {
                if let Ok(v) = field.text().await {
                    doc_type_str = v;
                }
            }
            Some("front") => {
                if let Ok(b) = field.bytes().await {
                    if b.len() > MAX_IMAGE_BYTES {
                        return (
                            StatusCode::PAYLOAD_TOO_LARGE,
                            Json(json!({ "error": "front image exceeds maximum allowed size" })),
                        )
                            .into_response();
                    }
                    front_bytes = Some(b.to_vec());
                }
            }
            Some("back") => {
                if let Ok(b) = field.bytes().await {
                    if b.len() > MAX_IMAGE_BYTES {
                        return (
                            StatusCode::PAYLOAD_TOO_LARGE,
                            Json(json!({ "error": "back image exceeds maximum allowed size" })),
                        )
                            .into_response();
                    }
                    back_bytes = Some(b.to_vec());
                }
            }
            _ => {}
        }
    }

    // Validate
    let front = match front_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Missing 'front' image field" })),
            )
                .into_response();
        }
    };

    let doc_type = match DocumentType::parse_label(&doc_type_str) {
        Some(d) => d,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": format!("Unknown docType: {doc_type_str}") })),
            )
                .into_response();
        }
    };

    run_ocr_pipeline(front, back_bytes, doc_type)
        .await
        .into_response()
}

// ── JSON OCR endpoint (used by Cloudflare Worker adapter) ─────────────────────

#[derive(Deserialize)]
struct OcrJsonRequest {
    /// Base64-encoded front image (required).
    front_b64: String,
    /// Base64-encoded back image (optional, DNI/NIE only).
    back_b64: Option<String>,
    #[serde(default = "default_doc_type")]
    doc_type: String,
}

fn default_doc_type() -> String {
    "DNI".to_string()
}

async fn handle_ocr_json(Json(req): Json<OcrJsonRequest>) -> impl IntoResponse {
    // Decode base64 → bytes
    let front = match base64::engine::general_purpose::STANDARD.decode(&req.front_b64) {
        Ok(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Invalid or missing front_b64" })),
            )
                .into_response();
        }
    };

    if front.len() > MAX_IMAGE_BYTES {
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({ "error": "front image exceeds maximum allowed size" })),
        )
            .into_response();
    }

    let back_bytes: Option<Vec<u8>> = req
        .back_b64
        .as_deref()
        .and_then(|s| base64::engine::general_purpose::STANDARD.decode(s).ok())
        .and_then(|b| if b.len() <= MAX_IMAGE_BYTES { Some(b) } else { None });

    let doc_type = match DocumentType::parse_label(&req.doc_type) {
        Some(d) => d,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": format!("Unknown docType: {}", req.doc_type) })),
            )
                .into_response();
        }
    };

    // Delegate to shared logic (same as multipart handler)
    run_ocr_pipeline(front, back_bytes, doc_type)
        .await
        .into_response()
}

// ── Shared OCR pipeline ───────────────────────────────────────────────────────

async fn run_ocr_pipeline(
    front: Vec<u8>,
    back_bytes: Option<Vec<u8>>,
    doc_type: DocumentType,
) -> Json<OcrResponse> {
    let lang = match doc_type {
        DocumentType::Dni | DocumentType::Nie => "spa+eng",
        DocumentType::Passport => "eng+spa",
    };

    let front_text = match ocr::run_tesseract(&front, lang) {
        Ok(t) => t,
        Err(e) => {
            // Log full error server-side but never expose Tesseract internals to clients.
            tracing::error!("[ocr] Tesseract failed on front image: {e}");
            return Json(OcrResponse {
                success: false,
                profile_id: "ocr-error".into(),
                document_type: doc_type.as_str().to_string(),
                extracted_data: ExtractedData {
                    document_type: Some(doc_type.as_str().to_string()),
                    ..Default::default()
                },
                confidence: 0.0,
                avatar_url: None,
                raw_text: None,
                warnings: vec!["OCR processing failed — please retry with a clearer image.".to_string()],
            });
        }
    };

    let combined_text = if let (Some(back), true) = (
        &back_bytes,
        matches!(doc_type, DocumentType::Dni | DocumentType::Nie),
    ) {
        match ocr::run_tesseract(back, lang) {
            Ok(back_text) => format!("{front_text}\n{back_text}"),
            Err(_) => front_text.clone(),
        }
    } else {
        front_text.clone()
    };

    let (mut extracted, confidence) = parser::parse(&combined_text, &doc_type);
    extracted.document_type = Some(doc_type.as_str().to_string());

    let has_data = extracted.document_number.is_some()
        || extracted.first_name.is_some()
        || extracted.last_name.is_some()
        || extracted.date_of_birth.is_some();

    let mut warnings = vec![];
    if confidence < 0.4 {
        warnings.push("Confianza OCR baja — revise y complete los datos manualmente.".to_string());
    }

    info!(
        doc_type = doc_type.as_str(),
        confidence, has_data, "OCR completed"
    );

    Json(OcrResponse {
        success: has_data,
        profile_id: Uuid::new_v4().to_string(),
        document_type: doc_type.as_str().to_string(),
        extracted_data: extracted,
        confidence,
        avatar_url: None,
        raw_text: Some(combined_text),
        warnings,
    })
}

// ── Main ──────────────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "ocr_service=info,tower_http=info".into()),
        )
        .init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8788);

    let cors = CorsLayer::new()
        .allow_origin([
            "http://localhost:4321".parse::<HeaderValue>().unwrap(),
            "http://localhost:3000".parse::<HeaderValue>().unwrap(),
            "https://albergue-carrascalejo.com"
                .parse::<HeaderValue>()
                .unwrap(),
        ])
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health))
        .route("/ocr", post(handle_ocr))
        .route("/ocr/json", post(handle_ocr_json))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("OCR service (Tesseract) listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
