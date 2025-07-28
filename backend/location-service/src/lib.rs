use anyhow::Result;
use http::{Request, StatusCode};
use spin_sdk::http::{IntoResponse, ResponseBuilder};
use spin_sdk::http_component;
use serde::{Deserialize, Serialize};
use serde_json::json;
use reqwest::Client;
use redis::{Client as RedisClient, Commands};
use std::time::Duration;
use chrono::Utc;
use std::env;

#[derive(Serialize, Deserialize, Debug)]
struct CountryData {
    name: String,
    calling_codes: Vec<String>,
    flag: String,
    country_code: String,
    last_updated: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct RestCountryResponse {
    name: Name,
    cca2: String,
    calling_code: String,
    flag: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct Name {
    common: String,
}

struct CountryService {
    redis_client: RedisClient,
    http_client: Client,
    cache_duration: Duration,
}

impl CountryService {
    fn new() -> Self {
        let redis_url = env::var("REDIS_URL").unwrap_or("redis://localhost".to_string());
        Self {
            redis_client: RedisClient::open(redis_url).unwrap(),
            http_client: Client::new(),
            cache_duration: Duration::from_secs(24 * 60 * 60), // 24 hours
        }
    }

    fn get_cache_key(&self, country_code: &str) -> String {
        format!("country:{}", country_code)
    }

    async fn get_country_data(&self, country_code: &str) -> Result<Option<CountryData>> {
        let mut conn = self.redis_client.get_connection()?;
        let cache_key = self.get_cache_key(country_code);

        // Try to get from cache first
        if let Ok(cached) = conn.get::<&str, String>(&cache_key) {
            if let Ok(data) = serde_json::from_str(&cached) {
                return Ok(Some(data));
            }
        }

        // If not in cache, fetch from RESTCountries API
        let url = format!("https://restcountries.com/v3.1/alpha/{}", country_code);
        let response = self.http_client.get(&url).send().await?;

        if !response.status().is_success() {
            return Ok(None);
        }

        let data: Vec<RestCountryResponse> = response.json().await?;
        if let Some(country) = data.first() {
            let country_data = CountryData {
                name: country.name.common.clone(),
                calling_codes: vec![format!("+{}", country.calling_code)],
                flag: country.flag.clone(),
                country_code: country.cca2.clone(),
                last_updated: Utc::now().to_rfc3339(),
            };

            // Cache the result
            let json_data = serde_json::to_string(&country_data)?;
            conn.set_ex(&cache_key, json_data, self.cache_duration.as_secs() as usize)?;

            Ok(Some(country_data))
        } else {
            Ok(None)
        }
    }

    async fn warm_cache(&self, country_codes: &[&str]) -> Result<()> {
        for code in country_codes {
            self.get_country_data(code).await?;
        }
        Ok(())
    }
}

#[http_component]
fn handle_request(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let method = req.method();
    let path = req.uri().path();
    let service = CountryService::new();

    // Handle CORS preflight requests
    if method == "OPTIONS" {
        return Ok(ResponseBuilder::new(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type")
            .build());
    }

    match (method, path) {
        ("GET", "/api/countries/{code}") => {
            let code = path.split('/').last().unwrap_or("".to_string());
            match service.get_country_data(code).await? {
                Some(data) => Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(serde_json::to_string(&data)?)
                    .build()),
                None => Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(r#"{"error":"Country not found"}"#)
                    .build()),
            }
        }
        ("POST", "/api/countries/warm-cache") => {
            let common_countries = ["ES", "FR", "PT", "IT"];
            service.warm_cache(&common_countries).await?;
            Ok(ResponseBuilder::new(StatusCode::OK)
                .header("content-type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(r#"{"message":"Cache warmed successfully"}"#)
                .build())
        }
        _ => Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(r#"{"error":"Not found"}"#)
            .build()),
    }
}
