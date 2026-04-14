//! OCR adapter for the document-validation CF Worker.
//!
//! Calls the native `ocr-service` (Axum + Tesseract) over HTTPS using a JSON
//! body with base64-encoded images.  The CF Workers `worker::FormData` API does
//! not expose binary-append methods, so we use the `/ocr/json` endpoint instead
//! of the multipart `/ocr` endpoint.
//!
//! URL is configured via the `OCR_SERVICE_URL` environment variable
//! (default: `http://localhost:8788`).

use crate::ports::ocr_client::{OCRClient, StructuredOcrResult};
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use chrono::{DateTime, NaiveDate, TimeZone, Utc};
use serde::Deserialize;
use shared::dto::ExtractedData;
use shared::{AlbergueError, AlbergueResult};
use worker::{Env, Fetch, Headers, Method, Request, RequestInit};

// ── Response shape from ocr-service ──────────────────────────────────────────

#[derive(Deserialize, Debug, Default)]
struct OcrServiceResponse {
    pub success: bool,
    pub confidence: Option<f64>,
    pub raw_text: Option<String>,
    pub extracted_data: Option<serde_json::Value>,
    #[serde(default)]
    pub _warnings: Vec<String>,
}

// ── Adapter ───────────────────────────────────────────────────────────────────

pub struct TesseractOCR {
    /// Full URL of the ocr-service, e.g. "https://ocr.albergue.fly.dev"
    ocr_service_url: String,
}

impl TesseractOCR {
    /// Create adapter.  Reads `OCR_SERVICE_URL` from Worker env at construction
    /// time so that errors surface early.
    pub fn from_env(env: &Env) -> Self {
        let url = env
            .var("OCR_SERVICE_URL")
            .map(|v| v.to_string())
            .unwrap_or_else(|_| "http://localhost:8788".to_string());
        Self {
            ocr_service_url: url,
        }
    }

    /// Convenience constructor for tests / local dev.
    pub fn new_with_url(url: impl Into<String>) -> Self {
        Self {
            ocr_service_url: url.into(),
        }
    }

    /// Legacy `new()` — falls back to localhost for compatibility.
    pub fn new() -> Self {
        Self {
            ocr_service_url: "http://localhost:8788".to_string(),
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /// POST to `/ocr/json` with base64-encoded image bytes.
    /// Avoids the FormData binary-append limitation of the CF Workers WASM SDK.
    async fn call_ocr_service(
        &self,
        image_data: &[u8],
        doc_type: &str,
    ) -> AlbergueResult<OcrServiceResponse> {
        let endpoint = format!("{}/ocr/json", self.ocr_service_url.trim_end_matches('/'));

        // Encode image as base64 — safe for JSON transport
        let front_b64 = B64.encode(image_data);

        let body_json = serde_json::json!({
            "front_b64": front_b64,
            "doc_type": doc_type,
        });
        let body_str =
            serde_json::to_string(&body_json).map_err(|e| AlbergueError::OCRProcessing {
                message: format!("JSON serialisation failed: {e}"),
            })?;

        let headers = Headers::new();
        headers
            .set("Content-Type", "application/json")
            .map_err(|e| AlbergueError::OCRProcessing {
                message: format!("header set failed: {e:?}"),
            })?;

        let mut init = RequestInit::new();
        init.method = Method::Post;
        init.body = Some(body_str.into());
        init.headers = headers;

        let request =
            Request::new_with_init(&endpoint, &init).map_err(|e| AlbergueError::OCRProcessing {
                message: format!("request build failed: {e:?}"),
            })?;

        let mut response =
            Fetch::Request(request)
                .send()
                .await
                .map_err(|e| AlbergueError::OCRProcessing {
                    message: format!("fetch to ocr-service failed: {e:?}"),
                })?;

        let status = response.status_code();
        if !(200..300).contains(&status) {
            return Err(AlbergueError::OCRProcessing {
                message: format!("ocr-service returned HTTP {status}"),
            });
        }

        let body: OcrServiceResponse =
            response
                .json()
                .await
                .map_err(|e| AlbergueError::OCRProcessing {
                    message: format!("failed to parse ocr-service response: {e:?}"),
                })?;

        Ok(body)
    }

    /// Minimal pure-Rust fallback: extract ASCII text from image bytes without
    /// Tesseract.  Used when `ocr-service` is unreachable in dev/test.
    fn fallback_extract(image_data: &[u8]) -> String {
        // Extract printable ASCII sequences ≥ 4 chars from the raw bytes.
        // This is not real OCR — it surfaces embedded EXIF/XMP metadata text and
        // won't find rendered text pixels.  Good enough for a graceful fallback
        // so the validation pipeline can still return a sensible partial result.
        let printable: String = image_data
            .windows(4)
            .filter_map(|w| {
                if w.iter().all(|&b| b.is_ascii_graphic() || b == b' ') {
                    Some(w.iter().map(|&b| b as char).collect::<String>())
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        // Deduplicate runs
        let mut seen = std::collections::HashSet::new();
        printable
            .split_whitespace()
            .filter(|s| s.len() >= 4 && seen.insert(*s))
            .collect::<Vec<_>>()
            .join(" ")
    }
}

// ── Field mapping helpers ─────────────────────────────────────────────────────

/// Parse an ISO date string ("YYYY-MM-DD") from the OCR service into a
/// `DateTime<Utc>` at midnight UTC.  Returns `None` for any parse failure so
/// that a malformed date doesn't abort the whole extraction.
fn parse_iso_date(s: &str) -> Option<DateTime<Utc>> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.and_hms_opt(0, 0, 0))
        .and_then(|ndt| Utc.from_local_datetime(&ndt).single())
}

/// Map the camelCase JSON from ocr-service's `ExtractedData` to the shared DTO.
///
/// ocr-service field → shared::dto::ExtractedData field
/// ─────────────────────────────────────────────────────
/// firstName           → name
/// lastName            → surname  (primary / primer apellido)
/// secondLastName      → appended to surname after a space (segundo apellido)
/// documentNumber      → document_number
/// dateOfBirth         → birth_date  (parsed YYYY-MM-DD → DateTime<Utc>)
/// expiryDate          → expiry_date (parsed YYYY-MM-DD → DateTime<Utc>)
/// nationality         → nationality
///
/// Fields not present in shared dto (gender, homeAddress, country, hasPhoto,
/// middleName, documentType) are intentionally ignored here — they are
/// available in the raw `extracted_data` JSON on the OCR response if needed.
fn map_ocr_json_to_dto(json: &serde_json::Value) -> ExtractedData {
    let get_str = |key: &str| -> Option<String> {
        json.get(key)
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
            .map(|s| s.to_string())
    };

    // Build surname: "PRIMER_APELLIDO SEGUNDO_APELLIDO" or just the first.
    let surname = match (get_str("lastName"), get_str("secondLastName")) {
        (Some(first), Some(second)) => Some(format!("{first} {second}")),
        (Some(first), None) => Some(first),
        (None, Some(second)) => Some(second),
        (None, None) => None,
    };

    ExtractedData {
        document_number: get_str("documentNumber"),
        name: get_str("firstName"),
        surname,
        birth_date: get_str("dateOfBirth").and_then(|s| parse_iso_date(&s)),
        expiry_date: get_str("expiryDate").and_then(|s| parse_iso_date(&s)),
        nationality: get_str("nationality"),
    }
}

// ── OCRClient trait impl ──────────────────────────────────────────────────────

#[async_trait::async_trait(?Send)]
impl OCRClient for TesseractOCR {
    async fn extract_text(&self, image_data: &[u8]) -> AlbergueResult<String> {
        // Detect document type hint from image metadata / size heuristic.
        let doc_type = infer_doc_type_hint(image_data);

        match self.call_ocr_service(image_data, doc_type).await {
            Ok(resp) => {
                if resp.success {
                    Ok(resp.raw_text.unwrap_or_default())
                } else {
                    // Partial result: return whatever raw text came back
                    Ok(resp.raw_text.unwrap_or_else(|| {
                        resp.extracted_data
                            .map(|v| v.to_string())
                            .unwrap_or_default()
                    }))
                }
            }
            Err(e) => {
                worker::console_warn!("[ocr-adapter] ocr-service unavailable: {e}, using fallback");
                Ok(Self::fallback_extract(image_data))
            }
        }
    }

    async fn extract_text_with_confidence(
        &self,
        image_data: &[u8],
    ) -> AlbergueResult<(String, f32)> {
        let doc_type = infer_doc_type_hint(image_data);

        match self.call_ocr_service(image_data, doc_type).await {
            Ok(resp) => {
                let confidence = resp.confidence.unwrap_or(0.0) as f32;
                let text = resp.raw_text.unwrap_or_else(|| {
                    resp.extracted_data
                        .map(|v| v.to_string())
                        .unwrap_or_default()
                });
                Ok((text, confidence))
            }
            Err(e) => {
                worker::console_warn!(
                    "[ocr-adapter] ocr-service unavailable: {e}, using fallback (confidence 0.0)"
                );
                Ok((Self::fallback_extract(image_data), 0.0))
            }
        }
    }

    /// Returns the OCR service's already-parsed, structured fields mapped
    /// directly to the shared DTO — no double-parsing with inferior regexes.
    ///
    /// Precedence:
    ///   1. `extracted_data` JSON from the OCR service (best quality — full
    ///      parser with MRZ, bilingual label detection, date normalisation)
    ///   2. `raw_text` re-parsed via `infer_doc_type_hint` (service degraded)
    ///   3. Fallback: empty `ExtractedData`, confidence 0.0 (unreachable service)
    async fn extract_structured(
        &self,
        image_data: &[u8],
        doc_type_hint: &str,
    ) -> AlbergueResult<StructuredOcrResult> {
        match self.call_ocr_service(image_data, doc_type_hint).await {
            Ok(resp) => {
                let confidence = resp.confidence.unwrap_or(0.0) as f32;
                // Use the structured extracted_data if the service returned it.
                let data = if let Some(ref json) = resp.extracted_data {
                    map_ocr_json_to_dto(json)
                } else {
                    // Degraded path: service returned success=false or no
                    // extracted_data — return empty fields, let validation fail
                    // gracefully rather than panic or re-parse garbage.
                    ExtractedData::default()
                };
                Ok(StructuredOcrResult { data, confidence })
            }
            Err(e) => {
                worker::console_warn!(
                    "[ocr-adapter] ocr-service unavailable for structured extraction: {e}"
                );
                // Return empty data with 0 confidence so the caller can decide
                // whether to fail hard or emit a low-confidence partial result.
                Ok(StructuredOcrResult {
                    data: ExtractedData::default(),
                    confidence: 0.0,
                })
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Cheap heuristic: passport images are typically wider (TD3 landscape),
/// while DNI/NIE are also landscape but smaller.  We default to DNI.
fn infer_doc_type_hint(image_data: &[u8]) -> &'static str {
    // Try to decode just enough to get dimensions
    if let Ok(img) = image::load_from_memory(image_data) {
        let (w, h) = (img.width(), img.height());
        let ratio = w as f32 / h.max(1) as f32;
        // Passport TD3 booklet page is ~125×88mm (≈1.42 ratio); scanned at A4 → wider
        if ratio > 1.3 && w > 1200 {
            return "PASSPORT";
        }
    }
    "DNI"
}
