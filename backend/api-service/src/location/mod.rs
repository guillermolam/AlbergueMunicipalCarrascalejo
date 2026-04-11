use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Serialize, Deserialize)]
struct CountryInfo {
    country: String,
    country_code: String,
    calling_code: String,
    flag: String,
}

pub async fn get_country(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let code = ctx.param("code").cloned().unwrap_or_default();

    if code.len() != 2 {
        return Response::error("Country code must be 2 characters", 400);
    }

    // Check KV cache first
    let kv = ctx.kv("CACHE")?;
    let cache_key = format!("country:{code}");
    if let Some(cached) = kv.get(&cache_key).text().await? {
        return Response::from_json(&serde_json::from_str::<serde_json::Value>(&cached)?);
    }

    let info = CountryInfo {
        country: country_name(&code),
        country_code: code.to_uppercase(),
        calling_code: calling_code(&code),
        flag: format!("https://flagcdn.com/{}.svg", code.to_lowercase()),
    };

    // Cache for 24 hours
    let json = serde_json::to_string(&info)?;
    kv.put(&cache_key, &json)?
        .expiration_ttl(86400)
        .execute()
        .await?;

    Response::from_json(&info)
}

pub async fn list_countries(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&serde_json::json!([
        {"code": "ES", "name": "Spain"},
        {"code": "FR", "name": "France"},
        {"code": "PT", "name": "Portugal"},
        {"code": "IT", "name": "Italy"},
        {"code": "DE", "name": "Germany"},
        {"code": "GB", "name": "United Kingdom"},
        {"code": "US", "name": "United States"}
    ]))
}

pub async fn search_locations(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&serde_json::json!({
        "locations": [
            {"name": "Mérida Historic Center", "latitude": 38.9165, "longitude": -6.3363, "distance": "0.5km"},
            {"name": "Roman Theatre", "latitude": 38.9156, "longitude": -6.3356, "distance": "0.8km"}
        ]
    }))
}

fn country_name(code: &str) -> String {
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

fn calling_code(code: &str) -> String {
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
