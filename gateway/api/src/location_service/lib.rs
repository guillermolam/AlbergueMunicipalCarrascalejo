use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/api/location/search") => {
            let response_body = serde_json::json!({
                "locations": [
                    {
                        "name": "Mérida Historic Center",
                        "latitude": 38.9165,
                        "longitude": -6.3363,
                        "distance": "0.5km"
                    },
                    {
                        "name": "Roman Theatre",
                        "latitude": 38.9156,
                        "longitude": -6.3356,
                        "distance": "0.8km"
                    }
                ]
            })
            .to_string();

            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        }
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Location endpoint not found"
            })
            .to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}

use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{Request, Response};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct CountryResponse {
    pub code: String,
    pub name: String,
    pub flag_url: String,
    pub currency: String,
    pub languages: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CountryInfo {
    pub country: String,
    pub country_code: String,
    pub calling_code: String,
    pub flag: String,
}

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/api/countries/") => get_country_info(req).await,
        ("OPTIONS", _) => {
            // Handle CORS preflight
            Ok(Response::builder()
                .status(200)
                .header("Access-Control-Allow-Origin", "*")
                .header(
                    "Access-Control-Allow-Methods",
                    "GET, POST, PUT, DELETE, OPTIONS",
                )
                .header(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization",
                )
                .body(None)?)
        }
        _ => Ok(Response::builder()
            .status(404)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Not Found",
                "message": "Country service endpoint not found"
            }))?))?),
    }
}

async fn get_country_info(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let country_code = path.trim_start_matches("/api/countries/");

    if country_code.is_empty() || country_code.len() != 2 {
        return Ok(Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Invalid country code",
                "message": "Country code must be 2 characters"
            }))?))?);
    }

    // For now, return mock data as the actual country cache service integration
    // would require proper service discovery and HTTP client setup
    let country_info = CountryResponse {
        code: country_code.to_uppercase(),
        name: get_country_name(country_code),
        flag_url: format!("https://flagcdn.com/{}.svg", country_code.to_lowercase()),
        currency: get_currency_code(country_code),
        languages: get_languages(country_code),
    };

    let frontend_response = CountryInfo {
        country: country_info.name.clone(),
        country_code: country_info.code.clone(),
        calling_code: get_calling_code(country_code),
        flag: country_info.flag_url.clone(),
    };

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(Some(serde_json::to_vec(&frontend_response)?))?)
}

fn get_country_name(code: &str) -> String {
    match code.to_uppercase().as_str() {
        "ES" => "Spain",
        "FR" => "France",
        "PT" => "Portugal",
        "IT" => "Italy",
        "DE" => "Germany",
        "GB" => "United Kingdom",
        "US" => "United States",
        _ => "Unknown",
    }
    .to_string()
}

fn get_currency_code(code: &str) -> String {
    match code.to_uppercase().as_str() {
        "ES" | "FR" | "PT" | "IT" | "DE" => "EUR",
        "GB" => "GBP",
        "US" => "USD",
        _ => "EUR",
    }
    .to_string()
}

fn get_languages(code: &str) -> Vec<String> {
    match code.to_uppercase().as_str() {
        "ES" => vec!["es".to_string()],
        "FR" => vec!["fr".to_string()],
        "PT" => vec!["pt".to_string()],
        "IT" => vec!["it".to_string()],
        "DE" => vec!["de".to_string()],
        "GB" => vec!["en".to_string()],
        "US" => vec!["en".to_string()],
        _ => vec!["en".to_string()],
    }
}

fn get_calling_code(code: &str) -> String {
    match code.to_uppercase().as_str() {
        "ES" => "+34",
        "FR" => "+33",
        "PT" => "+351",
        "IT" => "+39",
        "DE" => "+49",
        "GB" => "+44",
        "US" => "+1",
        _ => "+34",
    }
    .to_string()
}
