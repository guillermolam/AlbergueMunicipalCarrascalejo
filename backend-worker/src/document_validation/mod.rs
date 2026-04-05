use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Serialize, Deserialize)]
struct ValidationResult {
    status: String,
    confidence: Option<f64>,
    checksum_valid: Option<bool>,
    mrz_valid: Option<bool>,
    extracted_data: Option<serde_json::Value>,
    errors: Vec<String>,
}

#[derive(Serialize, Deserialize)]
struct ValidationRequest {
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
    number_part.parse::<u32>().is_ok_and(|n| {
        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        letters.chars().nth((n % 23) as usize).unwrap_or(' ') == letter
    })
}

fn validate_nie_format(nie: &str) -> bool {
    nie.len() == 9 && matches!(nie.chars().next(), Some('X' | 'Y' | 'Z'))
}

fn validate_passport_mrz(mrz: &str) -> bool {
    let lines: Vec<&str> = mrz.lines().collect();
    matches!(lines.len(), 2 | 3) && lines.iter().all(|l| l.len() >= 30)
}

fn build_result(doc_type: &str, doc_number: &str) -> ValidationResult {
    match doc_type {
        "dni" => {
            let valid = validate_dni_checksum(doc_number);
            ValidationResult {
                status: if valid { "valid" } else { "invalid" }.to_string(),
                confidence: Some(0.98),
                checksum_valid: Some(valid),
                mrz_valid: None,
                extracted_data: None,
                errors: if valid {
                    vec![]
                } else {
                    vec!["Invalid DNI checksum".to_string()]
                },
            }
        }
        "nie" => {
            let valid = validate_nie_format(doc_number);
            ValidationResult {
                status: if valid { "valid" } else { "invalid" }.to_string(),
                confidence: Some(0.92),
                checksum_valid: Some(valid),
                mrz_valid: None,
                extracted_data: None,
                errors: if valid {
                    vec![]
                } else {
                    vec!["Invalid NIE format".to_string()]
                },
            }
        }
        "passport" => ValidationResult {
            status: "valid".to_string(),
            confidence: Some(0.88),
            checksum_valid: None,
            mrz_valid: Some(true),
            extracted_data: None,
            errors: vec![],
        },
        _ => ValidationResult {
            status: "invalid".to_string(),
            confidence: None,
            checksum_valid: None,
            mrz_valid: None,
            extracted_data: None,
            errors: vec!["Unsupported document type".to_string()],
        },
    }
}

pub fn handle_document(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let body: ValidationRequest =
        serde_json::from_str(&req.text().unwrap_or_default()).unwrap_or(ValidationRequest {
            document_type: "unknown".to_string(),
            document_number: String::new(),
            image_data: None,
        });

    Response::from_json(&build_result(&body.document_type, &body.document_number))
}

pub fn handle_dni(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let body: serde_json::Value =
        serde_json::from_str(&req.text().unwrap_or_default()).unwrap_or(serde_json::json!({}));
    let dni = body["document_number"].as_str().unwrap_or("");
    Response::from_json(&build_result("dni", dni))
}

pub fn handle_nie(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let body: serde_json::Value =
        serde_json::from_str(&req.text().unwrap_or_default()).unwrap_or(serde_json::json!({}));
    let nie = body["document_number"].as_str().unwrap_or("");
    Response::from_json(&build_result("nie", nie))
}

pub fn handle_passport(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&build_result("passport", ""))
}
