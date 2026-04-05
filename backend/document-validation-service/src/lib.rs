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

#[derive(Serialize, Deserialize)]
struct DocumentValidationResult {
    status: String,
    confidence: Option<f64>,
    checksum_valid: Option<bool>,
    mrz_valid: Option<bool>,
    extracted_data: Option<serde_json::Value>,
    errors: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    warning: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stub: Option<bool>,
}

#[derive(Serialize, Deserialize)]
struct DocumentValidationRequest {
    document_type: String,
    document_number: String,
    image_data: Option<String>,
}

fn validate_dni_checksum(dni: &str) -> bool {
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

fn validate_nie_format(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    let first_char = nie.chars().next().unwrap_or(' ');
    matches!(first_char, 'X' | 'Y' | 'Z')
}

fn validate_passport_mrz(mrz: &str) -> bool {
    let lines: Vec<&str> = mrz.lines().collect();
    matches!(lines.len(), 2 | 3) && lines.iter().all(|line| line.len() >= 30)
}

// TODO: Implement real OCR processing via Cloudflare Workers AI or external API
async fn process_ocr_document(_image_data: &str) -> Result<serde_json::Value> {
    console_log!("[WARN] OCR processing is a stub - returning fixture data");
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

            console_log!("[WARN] Passport comprehensive validation is a stub - returning hardcoded valid status");
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

    console_log!("[WARN] Passport validation is a stub - returning hardcoded valid result");
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
