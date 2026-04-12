// This service has extensive domain logic with many clippy pedantic/nursery
// findings that are acceptable for the OCR/validation domain code.
#![warn(clippy::all)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::missing_const_for_fn,
    clippy::same_length_and_capacity,
    clippy::future_not_send,
    clippy::wildcard_imports,
    clippy::new_without_default,
    clippy::must_use_candidate,
    clippy::uninlined_format_args,
    clippy::unreadable_literal,
    clippy::unused_self,
    clippy::needless_pass_by_value,
    clippy::semicolon_if_nothing_returned,
    clippy::manual_range_contains,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    clippy::cognitive_complexity,
    clippy::unnecessary_wraps,
    clippy::match_same_arms,
    clippy::option_if_let_else,
    clippy::redundant_closure_for_method_calls,
    clippy::manual_str_repeat,
    clippy::suboptimal_flops,
    clippy::cast_lossless,
    clippy::implicit_clone,
    clippy::unused_async,
    clippy::needless_return,
    clippy::manual_pattern_char_comparison,
    clippy::chars_next_cmp,
    clippy::manual_clamp
)]

use serde::{Deserialize, Serialize};
use worker::*;

pub mod adapters;
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ports;

use crate::domain::image_classifier::EuIdClassifier;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DocumentValidationResult {
    pub status: String,
    pub confidence: Option<f64>,
    pub checksum_valid: Option<bool>,
    pub mrz_valid: Option<bool>,
    pub extracted_data: Option<serde_json::Value>,
    pub errors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warning: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stub: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DocumentValidationRequest {
    pub document_type: String,
    pub document_number: String,
    pub image_data: Option<String>,
}

#[tracing::instrument(skip_all, fields(dni_len = dni.len()))]
pub fn validate_dni_checksum(dni: &str) -> bool {
    if dni.len() != 9 {
        return false;
    }

    let number_part = &dni[..8];
    let letter = dni.chars().nth(8).unwrap_or(' ');

    number_part.parse::<u32>().is_ok_and(|number| {
        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = letters.chars().nth((number % 23) as usize).unwrap_or(' ');
        letter == expected_letter
    })
}

#[tracing::instrument(skip_all, fields(nie_len = nie.len()))]
pub fn validate_nie_format(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    let first_char = nie.chars().next().unwrap_or(' ');
    matches!(first_char, 'X' | 'Y' | 'Z')
}

#[tracing::instrument(skip_all, fields(mrz_lines))]
pub fn validate_passport_mrz(mrz: &str) -> bool {
    let lines: Vec<&str> = mrz.lines().collect();
    matches!(lines.len(), 2 | 3) && lines.iter().all(|line| line.len() >= 30)
}

// TODO: Implement real OCR processing via Cloudflare Workers AI or external API
async fn process_ocr_document(_image_data: &str) -> Result<serde_json::Value> {
    tracing::warn!("OCR processing is a stub - returning fixture data");
    Ok(serde_json::json!({
        "stub": true,
        "warning": "Stub implementation - OCR processing not performed",
        "document_type": "detected_dni",
        "confidence": 0.95,
        "text_regions": [
            {"text": "12345678A", "confidence": 0.98},
            {"text": "JUAN PEREZ", "confidence": 0.92}
        ]
    }))
}

#[tracing::instrument(skip_all, fields(doc_type = %req_data.document_type))]
async fn validate_document_comprehensive(
    req_data: DocumentValidationRequest,
) -> Result<DocumentValidationResult> {
    let document_type = req_data.document_type.as_str();
    let document_number = &req_data.document_number;

    let validation_result = match document_type {
        "dni" => {
            let checksum_valid = validate_dni_checksum(document_number);

            let extracted_data = if let Some(ref image) = req_data.image_data {
                Some(process_ocr_document(image).await?)
            } else {
                None
            };

            DocumentValidationResult {
                status: if checksum_valid { "valid" } else { "invalid" }.to_string(),
                confidence: Some(0.95),
                checksum_valid: Some(checksum_valid),
                mrz_valid: None,
                extracted_data,
                errors: if checksum_valid {
                    vec![]
                } else {
                    vec!["Invalid DNI checksum".to_string()]
                },
                warning: None,
                stub: None,
            }
        }
        "nie" => {
            let format_valid = validate_nie_format(document_number);

            DocumentValidationResult {
                status: if format_valid { "valid" } else { "invalid" }.to_string(),
                confidence: Some(0.90),
                checksum_valid: Some(format_valid),
                mrz_valid: None,
                extracted_data: None,
                errors: if format_valid {
                    vec![]
                } else {
                    vec!["Invalid NIE format".to_string()]
                },
                warning: None,
                stub: None,
            }
        }
        // TODO: Implement real passport validation with actual MRZ parsing
        "passport" => {
            let mrz_valid = if let Some(ref image) = req_data.image_data {
                let ocr_result = process_ocr_document(image).await?;
                let mrz_text = ocr_result["mrz"].as_str().unwrap_or("");
                Some(validate_passport_mrz(mrz_text))
            } else {
                None
            };

            tracing::warn!(
                "Passport comprehensive validation is a stub - returning hardcoded valid status"
            );
            DocumentValidationResult {
                status: "valid".to_string(),
                confidence: Some(0.88),
                checksum_valid: None,
                mrz_valid,
                extracted_data: None,
                errors: vec![],
                warning: Some(
                    "Stub implementation - passport validation not fully performed".to_string(),
                ),
                stub: Some(true),
            }
        }
        _ => DocumentValidationResult {
            status: "invalid".to_string(),
            confidence: None,
            checksum_valid: None,
            mrz_valid: None,
            extracted_data: None,
            errors: vec!["Unsupported document type".to_string()],
            warning: None,
            stub: None,
        },
    };

    Ok(validation_result)
}

fn build_validation_response(result: &DocumentValidationResult) -> Result<Response> {
    let mut resp = Response::from_json(result)?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    Ok(resp)
}

fn build_error_response(result: &DocumentValidationResult, status: u16) -> Result<Response> {
    let body = serde_json::to_string(result).unwrap_or_default();
    let mut resp = Response::error(&body, status)?;
    resp.headers_mut().set("Content-Type", "application/json")?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    Ok(resp)
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let path = req.path();

    match (method, path.as_str()) {
        (Method::Post, "/validate/document") => handle_document_validation(&mut req).await,
        (Method::Post, "/validate/dni") => handle_dni_validation(&mut req).await,
        (Method::Post, "/validate/nie") => handle_nie_validation(&mut req).await,
        (Method::Post, "/validate/passport") => handle_passport_validation(&mut req).await,
        (Method::Post, "/validate/image-upload") => handle_image_upload_validation(&mut req).await,
        _ => {
            let result = DocumentValidationResult {
                status: "error".to_string(),
                confidence: None,
                checksum_valid: None,
                mrz_valid: None,
                extracted_data: None,
                errors: vec!["Validation endpoint not found".to_string()],
                warning: None,
                stub: None,
            };
            build_error_response(&result, 404)
        }
    }
}

async fn handle_document_validation(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let req_data: DocumentValidationRequest =
        serde_json::from_str(&body).unwrap_or_else(|_| DocumentValidationRequest {
            document_type: "unknown".to_string(),
            document_number: String::new(),
            image_data: None,
        });

    let result = validate_document_comprehensive(req_data).await?;
    build_validation_response(&result)
}

async fn handle_dni_validation(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let req_data: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let dni = req_data["document_number"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let checksum_valid = validate_dni_checksum(&dni);
    let result = DocumentValidationResult {
        status: if checksum_valid { "valid" } else { "invalid" }.to_string(),
        confidence: Some(0.98),
        checksum_valid: Some(checksum_valid),
        mrz_valid: None,
        extracted_data: None,
        errors: vec![],
        warning: None,
        stub: None,
    };

    build_validation_response(&result)
}

async fn handle_nie_validation(req: &mut Request) -> Result<Response> {
    let body = req.text().await?;
    let req_data: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let nie = req_data["document_number"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let format_valid = validate_nie_format(&nie);
    let result = DocumentValidationResult {
        status: if format_valid { "valid" } else { "invalid" }.to_string(),
        confidence: Some(0.92),
        checksum_valid: Some(format_valid),
        mrz_valid: None,
        extracted_data: None,
        errors: vec![],
        warning: None,
        stub: None,
    };

    build_validation_response(&result)
}

// TODO: Implement real passport validation - currently returns hardcoded valid result
async fn handle_passport_validation(req: &mut Request) -> Result<Response> {
    let _body = req.text().await?;

    tracing::warn!("Passport validation is a stub - returning hardcoded valid result");
    let result = DocumentValidationResult {
        status: "valid".to_string(),
        confidence: Some(0.88),
        checksum_valid: None,
        mrz_valid: Some(true),
        extracted_data: None,
        errors: vec![],
        warning: Some("Stub implementation - passport validation not performed".to_string()),
        stub: Some(true),
    };

    build_validation_response(&result)
}

/// POST /validate/image-upload
///
/// Validates an uploaded document image against Cloudflare Images constraints
/// and runs the heuristic EU-ID classifier to detect document type and side.
///
/// Request body (JSON):
/// ```json
/// {
///   "image_data": "<base64-encoded bytes>",
///   "mime_type":  "image/jpeg",
///   "declared_type": "dni"   // "dni" | "passport" — what the user selected
/// }
/// ```
///
/// Response (JSON):
/// ```json
/// {
///   "format_valid": true,
///   "size_valid": true,
///   "dimensions_valid": true,
///   "width": 1200,
///   "height": 756,
///   "file_size_bytes": 184320,
///   "errors": [],
///   "classification": {
///     "doc_type": "eu_id_card",
///     "side": "front",
///     "confidence": 0.87,
///     "aspect_ratio": 1.587,
///     "has_mrz_zone": false,
///     "mrz_rows_detected": 0,
///     "has_photo_region": true,
///     "country_hint": null,
///     "warnings": []
///   },
///   "type_mismatch": false,
///   "side_warning": null
/// }
/// ```
async fn handle_image_upload_validation(req: &mut Request) -> Result<Response> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let body = req.text().await?;
    let payload: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let image_b64 = payload["image_data"].as_str().unwrap_or("");
    let mime_type = payload["mime_type"].as_str().unwrap_or("image/jpeg");
    let declared_type = payload["declared_type"].as_str().unwrap_or("unknown");

    if image_b64.is_empty() {
        let result = serde_json::json!({
            "format_valid": false,
            "size_valid": false,
            "dimensions_valid": false,
            "width": null,
            "height": null,
            "file_size_bytes": 0,
            "errors": ["No image data provided"],
            "classification": null,
            "type_mismatch": false,
            "side_warning": null
        });
        let mut resp = Response::from_json(&result)?;
        resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
        return Ok(resp);
    }

    let image_bytes = STANDARD
        .decode(image_b64)
        .map_err(|e| worker::Error::RustError(format!("base64 decode error: {e}")))?;

    let validation = EuIdClassifier::validate_and_classify(&image_bytes, Some(mime_type));

    // Check for declared-vs-detected type mismatch
    let type_mismatch = validation.classification.as_ref().is_some_and(|c| {
        use crate::domain::image_classifier::DetectedDocType;
        match declared_type {
            "dni" | "nie" => c.doc_type == DetectedDocType::Passport,
            "passport" => c.doc_type == DetectedDocType::EuIdCard,
            _ => false,
        }
    });

    // Generate a side warning for DNI/NIE uploads
    let side_warning: Option<String> = validation.classification.as_ref().and_then(|c| {
        use crate::domain::image_classifier::DetectedSide;
        if declared_type == "dni" || declared_type == "nie" {
            match c.side {
                DetectedSide::Unknown if c.confidence < 0.5 => {
                    Some("Could not determine if this is the front or back — please ensure the full card is visible.".to_string())
                }
                _ => None,
            }
        } else {
            None
        }
    });

    let result = serde_json::json!({
        "format_valid":      validation.format_valid,
        "size_valid":        validation.size_valid,
        "dimensions_valid":  validation.dimensions_valid,
        "width":             validation.width,
        "height":            validation.height,
        "file_size_bytes":   validation.file_size_bytes,
        "errors":            validation.errors,
        "classification":    validation.classification,
        "type_mismatch":     type_mismatch,
        "side_warning":      side_warning,
    });

    let mut resp = Response::from_json(&result)?;
    resp.headers_mut().set("Access-Control-Allow-Origin", "*")?;
    resp.headers_mut().set("Content-Type", "application/json")?;
    Ok(resp)
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- validate_dni_checksum tests ---

    #[test]
    fn test_dni_checksum_valid_12345678z() {
        // 12345678 % 23 = 14 -> letter at index 14 is 'Z'
        assert!(validate_dni_checksum("12345678Z"));
    }

    #[test]
    fn test_dni_checksum_valid_00000000t() {
        // 0 % 23 = 0 -> letter at index 0 is 'T'
        assert!(validate_dni_checksum("00000000T"));
    }

    #[test]
    fn test_dni_checksum_valid_00000023t() {
        // 23 % 23 = 0 -> 'T'
        assert!(validate_dni_checksum("00000023T"));
    }

    #[test]
    fn test_dni_checksum_valid_99999999r() {
        // 99999999 % 23 = 99999999 mod 23 = let's compute: 99999999/23=4347826 rem 1 -> index 1 = 'R'
        assert!(validate_dni_checksum("99999999R"));
    }

    #[test]
    fn test_dni_checksum_invalid_wrong_letter() {
        // 12345678 -> Z is correct, A is wrong
        assert!(!validate_dni_checksum("12345678A"));
    }

    #[test]
    fn test_dni_checksum_too_short() {
        assert!(!validate_dni_checksum("1234567Z"));
    }

    #[test]
    fn test_dni_checksum_too_long() {
        assert!(!validate_dni_checksum("123456789Z"));
    }

    #[test]
    fn test_dni_checksum_empty() {
        assert!(!validate_dni_checksum(""));
    }

    #[test]
    fn test_dni_checksum_non_numeric_prefix() {
        assert!(!validate_dni_checksum("ABCDEFGHZ"));
    }

    #[test]
    fn test_dni_checksum_lowercase_letter() {
        // lowercase 'z' should not match uppercase 'Z'
        assert!(!validate_dni_checksum("12345678z"));
    }

    // --- validate_nie_format tests ---

    #[test]
    fn test_nie_format_valid_x() {
        assert!(validate_nie_format("X1234567A"));
    }

    #[test]
    fn test_nie_format_valid_y() {
        assert!(validate_nie_format("Y1234567B"));
    }

    #[test]
    fn test_nie_format_valid_z() {
        assert!(validate_nie_format("Z1234567C"));
    }

    #[test]
    fn test_nie_format_invalid_prefix_a() {
        assert!(!validate_nie_format("A1234567Z"));
    }

    #[test]
    fn test_nie_format_too_short() {
        assert!(!validate_nie_format("X123456"));
    }

    #[test]
    fn test_nie_format_too_long() {
        assert!(!validate_nie_format("X123456789"));
    }

    #[test]
    fn test_nie_format_empty() {
        assert!(!validate_nie_format(""));
    }

    #[test]
    fn test_nie_format_lowercase_prefix() {
        assert!(!validate_nie_format("x1234567A"));
    }

    // --- validate_passport_mrz tests ---

    #[test]
    fn test_mrz_valid_two_lines() {
        let mrz = "P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<\n1234567890ESP9001011M3012315<<<<<<<<<<<<<<02";
        assert!(validate_passport_mrz(mrz));
    }

    #[test]
    fn test_mrz_valid_three_lines() {
        let mrz = "I<ESP12345678901234<<<<<<<<<<<<\n9001011M3012315ESP<<<<<<<<<<<<0\nGARCIA<<JUAN<<<<<<<<<<<<<<<<<<";
        assert!(validate_passport_mrz(mrz));
    }

    #[test]
    fn test_mrz_invalid_single_line() {
        assert!(!validate_passport_mrz(
            "P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<"
        ));
    }

    #[test]
    fn test_mrz_invalid_short_lines() {
        let mrz = "SHORT\nLINES";
        assert!(!validate_passport_mrz(mrz));
    }

    #[test]
    fn test_mrz_empty() {
        assert!(!validate_passport_mrz(""));
    }

    // --- DocumentValidationResult serialization tests ---

    #[test]
    fn test_result_serialization_full() {
        let result = DocumentValidationResult {
            status: "valid".to_string(),
            confidence: Some(0.95),
            checksum_valid: Some(true),
            mrz_valid: Some(false),
            extracted_data: None,
            errors: vec![],
            warning: Some("test warning".to_string()),
            stub: Some(true),
        };

        let json = serde_json::to_string(&result).unwrap();
        let deserialized: DocumentValidationResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.status, "valid");
        assert_eq!(deserialized.confidence, Some(0.95));
        assert_eq!(deserialized.checksum_valid, Some(true));
        assert_eq!(deserialized.warning, Some("test warning".to_string()));
    }

    #[test]
    fn test_result_serialization_skip_none_warning() {
        let result = DocumentValidationResult {
            status: "valid".to_string(),
            confidence: Some(0.95),
            checksum_valid: Some(true),
            mrz_valid: None,
            extracted_data: None,
            errors: vec![],
            warning: None,
            stub: None,
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(!json.contains("warning"));
        assert!(!json.contains("stub"));
    }

    // --- DocumentValidationRequest deserialization tests ---

    #[test]
    fn test_request_deserialization() {
        let json = r#"{"document_type":"dni","document_number":"12345678Z","image_data":null}"#;
        let req: DocumentValidationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.document_type, "dni");
        assert_eq!(req.document_number, "12345678Z");
        assert!(req.image_data.is_none());
    }

    #[test]
    fn test_request_deserialization_with_image() {
        let json =
            r#"{"document_type":"nie","document_number":"X1234567A","image_data":"base64data"}"#;
        let req: DocumentValidationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.document_type, "nie");
        assert_eq!(req.image_data, Some("base64data".to_string()));
    }

    #[test]
    fn test_request_roundtrip() {
        let original = DocumentValidationRequest {
            document_type: "passport".to_string(),
            document_number: "ABC123456".to_string(),
            image_data: None,
        };
        let json = serde_json::to_string(&original).unwrap();
        let deserialized: DocumentValidationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(original, deserialized);
    }

    // --- validate_document_comprehensive tests (async, via tokio) ---

    #[tokio::test]
    async fn test_comprehensive_valid_dni() {
        let req = DocumentValidationRequest {
            document_type: "dni".to_string(),
            document_number: "12345678Z".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "valid");
        assert_eq!(result.checksum_valid, Some(true));
        assert!(result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_comprehensive_invalid_dni() {
        let req = DocumentValidationRequest {
            document_type: "dni".to_string(),
            document_number: "12345678A".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "invalid");
        assert_eq!(result.checksum_valid, Some(false));
        assert!(result.errors.contains(&"Invalid DNI checksum".to_string()));
    }

    #[tokio::test]
    async fn test_comprehensive_valid_nie() {
        let req = DocumentValidationRequest {
            document_type: "nie".to_string(),
            document_number: "X1234567A".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "valid");
        assert_eq!(result.checksum_valid, Some(true));
    }

    #[tokio::test]
    async fn test_comprehensive_invalid_nie() {
        let req = DocumentValidationRequest {
            document_type: "nie".to_string(),
            document_number: "A1234567Z".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "invalid");
        assert!(result.errors.contains(&"Invalid NIE format".to_string()));
    }

    #[tokio::test]
    async fn test_comprehensive_passport_no_image() {
        let req = DocumentValidationRequest {
            document_type: "passport".to_string(),
            document_number: "ABC123456".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "valid");
        assert_eq!(result.stub, Some(true));
        assert!(result.warning.is_some());
    }

    #[tokio::test]
    async fn test_comprehensive_unsupported_type() {
        let req = DocumentValidationRequest {
            document_type: "driving_license".to_string(),
            document_number: "DL12345".to_string(),
            image_data: None,
        };
        let result = validate_document_comprehensive(req).await.unwrap();
        assert_eq!(result.status, "invalid");
        assert!(result
            .errors
            .contains(&"Unsupported document type".to_string()));
        assert!(result.confidence.is_none());
    }
}
