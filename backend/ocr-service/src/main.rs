//! Tesseract-powered OCR service — native Axum HTTP server.
//!
//! Replaces the former Cloudflare Worker implementation with a standard Rust
//! binary that runs locally (and can be deployed to any Linux host).
//!
//! API surface (identical to the CF Worker contract):
//!   GET  /health          → { service, status }
//!   POST /ocr             → multipart: front (required), back (optional), docType
//!                        ← OcrResponse JSON

mod models;
mod ocr;
mod parser;
mod preprocess;

use std::net::SocketAddr;

use anyhow::Result;
use axum::{
    extract::Multipart,
    http::{HeaderValue, Method, StatusCode},
    response::{IntoResponse, Json},
    routing::{get, post},
    Router,
};
use serde_json::json;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;
use uuid::Uuid;

use models::{DocumentType, ExtractedData, OcrResponse};

// ── Health endpoint ───────────────────────────────────────────────────────────

async fn health() -> impl IntoResponse {
    Json(json!({ "service": "albergue-ocr", "status": "ok", "engine": "tesseract" }))
}

// ── OCR endpoint ──────────────────────────────────────────────────────────────

async fn handle_ocr(mut multipart: Multipart) -> impl IntoResponse {
    let mut front_bytes: Option<Vec<u8>> = None;
    let mut back_bytes:  Option<Vec<u8>> = None;
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
                    front_bytes = Some(b.to_vec());
                }
            }
            Some("back") => {
                if let Ok(b) = field.bytes().await {
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

    let doc_type = match DocumentType::from_str(&doc_type_str) {
        Some(d) => d,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": format!("Unknown docType: {doc_type_str}") })),
            )
                .into_response();
        }
    };

    // Select Tesseract language(s) based on document type
    let lang = match doc_type {
        DocumentType::Dni | DocumentType::Nie => "spa+eng",
        DocumentType::Passport                => "eng+spa",
    };

    // ── Front image OCR ───────────────────────────────────────────────────────
    let front_text = match ocr::run_tesseract(&front, lang) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("[ocr] Tesseract failed on front image: {e}");
            return Json(OcrResponse {
                success:        false,
                profile_id:     "ocr-error".into(),
                document_type:  doc_type.as_str().to_string(),
                extracted_data: ExtractedData {
                    document_type: Some(doc_type.as_str().to_string()),
                    ..Default::default()
                },
                confidence: 0.0,
                avatar_url: None,
                raw_text:   Some(e.to_string()),
                warnings:   vec![format!("Tesseract error: {e}")],
            })
            .into_response();
        }
    };

    // ── Back image OCR (DNI/NIE only) — merge results ─────────────────────────
    let combined_text = if let (Some(back), true) = (
        &back_bytes,
        matches!(doc_type, DocumentType::Dni | DocumentType::Nie),
    ) {
        match ocr::run_tesseract(back, lang) {
            Ok(back_text) => format!("{front_text}\n{back_text}"),
            Err(_)        => front_text.clone(),
        }
    } else {
        front_text.clone()
    };

    // ── Parse extracted text into structured fields ────────────────────────────
    let (mut extracted, confidence) = parser::parse(&combined_text, &doc_type);
    extracted.document_type = Some(doc_type.as_str().to_string());

    let has_data = extracted.document_number.is_some()
        || extracted.first_name.is_some()
        || extracted.last_name.is_some()
        || extracted.date_of_birth.is_some();

    let mut warnings = vec![];
    if confidence < 0.4 {
        warnings.push(
            "Confianza OCR baja — revise y complete los datos manualmente.".to_string(),
        );
    }

    info!(
        doc_type = doc_type.as_str(),
        confidence,
        has_data,
        "OCR completed"
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
    .into_response()
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
        .route("/ocr",    post(handle_ocr))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("OCR service (Tesseract) listening on http://{addr}");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
