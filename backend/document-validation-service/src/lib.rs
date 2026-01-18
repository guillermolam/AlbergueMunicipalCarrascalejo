#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

use anyhow::Result;
use http::StatusCode;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{Method, Request, Response};
use spin_sdk::http_component;
use tokio::task;

#[derive(Serialize, Deserialize)]
struct DocumentValidationResult {
    status: String,
    confidence: Option<f64>,
    checksum_valid: Option<bool>,
    mrz_valid: Option<bool>,
    extracted_data: Option<serde_json::Value>,
    errors: Vec<String>,
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

    if let Ok(number) = number_part.parse::<u32>() {
        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = letters.chars().nth((number % 23) as usize).unwrap_or(' ');
        letter == expected_letter
    } else {
        false
    }
}

fn validate_nie_format(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    let first_char = nie.chars().nth(0).unwrap_or(' ');
    matches!(first_char, 'X' | 'Y' | 'Z')
}

fn validate_passport_mrz(mrz: &str) -> bool {
    let lines: Vec<&str> = mrz.lines().collect();
    matches!(lines.len(), 2 | 3) && lines.iter().all(|line| line.len() >= 30)
}

async fn process_ocr_document(_image_data: &str) -> Result<serde_json::Value> {
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    Ok(serde_json::json!({
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
            let checksum_task = task::spawn({
                let doc_num = document_number.clone();
                async move { validate_dni_checksum(&doc_num) }
            });

            let ocr_task = if let Some(image) = req_data.image_data {
                Some(task::spawn(async move { process_ocr_document(&image).await }))
            } else {
                None
            };

            let checksum_valid = checksum_task.await?;
            let extracted_data = if let Some(ocr) = ocr_task {
                Some(ocr.await??)
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
            }
        }
        "nie" => {
            let format_task = task::spawn({
                let doc_num = document_number.clone();
                async move { validate_nie_format(&doc_num) }
            });

            let format_valid = format_task.await?;

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
            }
        }
        "passport" => {
            let mrz_task = if let Some(image) = req_data.image_data {
                Some(task::spawn(async move {
                    let ocr_result = process_ocr_document(&image).await?;
                    let mrz_text = ocr_result["mrz"].as_str().unwrap_or("");
                    Ok::<bool, anyhow::Error>(validate_passport_mrz(mrz_text))
                }))
            } else {
                None
            };

            let mrz_valid = if let Some(task) = mrz_task {
                Some(task.await??)
            } else {
                None
            };

            DocumentValidationResult {
                status: "valid".to_string(),
                confidence: Some(0.88),
                checksum_valid: None,
                mrz_valid,
                extracted_data: None,
                errors: vec![],
            }
        }
        _ => DocumentValidationResult {
            status: "invalid".to_string(),
            confidence: None,
            checksum_valid: None,
            mrz_valid: None,
            extracted_data: None,
            errors: vec!["Unsupported document type".to_string()],
        },
    };

    Ok(validation_result)
}

fn build_validation_response(
    status: StatusCode,
    result: &DocumentValidationResult,
) -> Result<Response> {
    Ok(Response::builder()
        .status(status)
        .header("content-type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(serde_json::to_vec(result)?)
        .build())
}

#[http_component]
async fn handle_request(req: Request) -> Result<Response> {
    let method = req.method();
    let path = req.uri();

    match (method, path) {
        (&Method::Post, "/validate/document") => handle_document_validation(req).await,
        (&Method::Post, "/validate/dni") => handle_dni_validation(req).await,
        (&Method::Post, "/validate/nie") => handle_nie_validation(req).await,
        (&Method::Post, "/validate/passport") => handle_passport_validation(req).await,
        _ => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(r#"{"error":"Validation endpoint not found"}"#.as_bytes().to_vec())
            .build())
    }
}

async fn handle_document_validation(req: Request) -> Result<Response> {
    let body_bytes = req.into_body();
    let body = std::str::from_utf8(&body_bytes)?;
    let req_data: DocumentValidationRequest =
        serde_json::from_str(body).unwrap_or_else(|_| DocumentValidationRequest {
            document_type: "unknown".to_string(),
            document_number: "".to_string(),
            image_data: None,
        });

    let result = validate_document_comprehensive(req_data).await?;
    build_validation_response(StatusCode::OK, &result)
}

async fn handle_dni_validation(req: Request) -> Result<Response> {
    let body_bytes = req.into_body();
    let body = std::str::from_utf8(&body_bytes)?;
    let req_data: serde_json::Value = serde_json::from_str(body)?;
    let dni = req_data["document_number"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let result = task::spawn(async move {
        let checksum_valid = validate_dni_checksum(&dni);
        DocumentValidationResult {
            status: if checksum_valid { "valid" } else { "invalid" }.to_string(),
            confidence: Some(0.98),
            checksum_valid: Some(checksum_valid),
            mrz_valid: None,
            extracted_data: None,
            errors: vec![],
        }
    })
    .await?;

    build_validation_response(StatusCode::OK, &result)
}

async fn handle_nie_validation(req: Request) -> Result<Response> {
    let body_bytes = req.into_body();
    let body = std::str::from_utf8(&body_bytes)?;
    let req_data: serde_json::Value = serde_json::from_str(body)?;
    let nie = req_data["document_number"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let result = task::spawn(async move {
        let format_valid = validate_nie_format(&nie);
        DocumentValidationResult {
            status: if format_valid { "valid" } else { "invalid" }.to_string(),
            confidence: Some(0.92),
            checksum_valid: Some(format_valid),
            mrz_valid: None,
            extracted_data: None,
            errors: vec![],
        }
    })
    .await?;

    build_validation_response(StatusCode::OK, &result)
}

async fn handle_passport_validation(req: Request) -> Result<Response> {
    let body_bytes = req.into_body();
    let body = std::str::from_utf8(&body_bytes)?;
    let _req_data: serde_json::Value = serde_json::from_str(body)?;

    let result = task::spawn(async move {
        // Simulate async passport validation
        tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

        DocumentValidationResult {
            status: "valid".to_string(),
            confidence: Some(0.88),
            checksum_valid: None,
            mrz_valid: Some(true),
            extracted_data: None,
            errors: vec![],
        }
    })
    .await?;

    build_validation_response(StatusCode::OK, &result)
}
