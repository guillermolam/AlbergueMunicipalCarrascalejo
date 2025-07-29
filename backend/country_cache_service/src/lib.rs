use redis_service::RedisService;
use redis_service::RedisServiceError;
use std::sync::Arc;
use std::time::Duration;
use spin_sdk::http::{Request, Response};
use spin_sdk::http_component;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CountryCacheError {
    #[error("Redis error: {0}")]
    Redis(#[from] RedisServiceError),
    #[error("Cache error: {0}")]
    Cache(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Country {
    pub code: String,
    pub name: String,
    pub flag_url: String,
    pub currency: String,
    pub languages: Vec<String>,
    pub calling_code: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CountryResponse {
    pub country: String,
    pub country_code: String,
    pub calling_code: String,
    pub flag: String,
}

pub struct CountryCache {
    redis: Arc<RedisService>,
    cache_duration: Duration,
}

impl CountryCache {
    pub fn new(redis: Arc<RedisService>, cache_duration: Duration) -> Self {
        Self {
            redis,
            cache_duration,
        }
    }

    pub async fn get_country(&self, country_code: &str) -> Result<Option<Country>, CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .get_with_expiry::<_, Country>(&key)
            .await
            .map_err(CountryCacheError::Redis)
    }

    pub async fn set_country(&self, country_code: &str, country: &Country) -> Result<(), CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .set_with_expiry(&key, country, self.cache_duration)
            .await
            .map_err(CountryCacheError::Redis)?;
        Ok(())
    }

    pub async fn clear_country_cache(&self, country_code: &str) -> Result<(), CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .delete_key(&key)
            .await
            .map_err(CountryCacheError::Redis)?;
        Ok(())
    }
}

#[http_component]
async fn handle_country_request(req: Request) -> Response {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/countries/") => {
            handle_get_country(req).await
        }
        ("POST", path) if path.starts_with("/countries/") => {
            handle_set_country(req).await
        }
        ("DELETE", path) if path.starts_with("/countries/") => {
            handle_clear_country(req).await
        }
        ("OPTIONS", _) => handle_cors_preflight(),
        _ => Response::builder()
            .status(404)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Not Found",
                "message": "Country cache endpoint not found"
            })).unwrap()))
            .unwrap(),
    }
}

async fn handle_get_country(req: Request) -> Response {
    let path = req.uri().path();
    let country_code = path.trim_start_matches("/countries/");
    
    if country_code.is_empty() || country_code.len() != 2 {
        return Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Invalid country code",
                "message": "Country code must be 2 characters"
            })).unwrap()))
            .unwrap();
    }

    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    
    let redis_service = match RedisService::new(&redis_url) {
        Ok(service) => Arc::new(service),
        Err(_) => {
            return Response::builder()
                .status(500)
                .header("Content-Type", "application/json")
                .body(Some(serde_json::to_vec(&serde_json::json!({
                    "error": "Service Unavailable",
                    "message": "Redis service not available"
                })).unwrap()))
                .unwrap();
        }
    };

    let cache = CountryCache::new(redis_service, Duration::from_secs(3600));
    
    match cache.get_country(country_code).await {
        Ok(Some(country)) => {
            let response = CountryResponse {
                country: country.name.clone(),
                country_code: country.code.clone(),
                calling_code: country.calling_code.clone(),
                flag: country.flag_url.clone(),
            };
            
            Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                .body(Some(serde_json::to_vec(&response).unwrap()))
                .unwrap()
        }
        Ok(None) => {
            // Return default country data if not in cache
            let default_country = get_default_country(country_code);
            let response = CountryResponse {
                country: default_country.name.clone(),
                country_code: default_country.code.clone(),
                calling_code: default_country.calling_code.clone(),
                flag: default_country.flag_url.clone(),
            };
            
            Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
                .body(Some(serde_json::to_vec(&response).unwrap()))
                .unwrap()
        }
        Err(_) => Response::builder()
            .status(500)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Internal Server Error",
                "message": "Failed to retrieve country information"
            })).unwrap()))
            .unwrap(),
    }
}

async fn handle_set_country(req: Request) -> Response {
    let path = req.uri().path();
    let country_code = path.trim_start_matches("/countries/");
    
    if country_code.is_empty() || country_code.len() != 2 {
        return Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Invalid country code",
                "message": "Country code must be 2 characters"
            })).unwrap()))
            .unwrap();
    }

    let body = match req.body().as_ref() {
        Some(body) => body,
        None => {
            return Response::builder()
                .status(400)
                .header("Content-Type", "application/json")
                .body(Some(serde_json::to_vec(&serde_json::json!({
                    "error": "Bad Request",
                    "message": "Request body is required"
                })).unwrap()))
                .unwrap();
        }
    };

    let country: Country = match serde_json::from_slice(body) {
        Ok(country) => country,
        Err(_) => {
            return Response::builder()
                .status(400)
                .header("Content-Type", "application/json")
                .body(Some(serde_json::to_vec(&serde_json::json!({
                    "error": "Bad Request",
                    "message": "Invalid country data"
                })).unwrap()))
                .unwrap();
        }
    };

    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    
    let redis_service = match RedisService::new(&redis_url) {
        Ok(service) => Arc::new(service),
        Err(_) => {
            return Response::builder()
                .status(500)
                .header("Content-Type", "application/json")
                .body(Some(serde_json::to_vec(&serde_json::json!({
                    "error": "Service Unavailable",
                    "message": "Redis service not available"
                })).unwrap()))
                .unwrap();
        }
    };

    let cache = CountryCache::new(redis_service, Duration::from_secs(3600));
    
    match cache.set_country(country_code, &country).await {
        Ok(_) => Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "message": "Country cached successfully"
            })).unwrap()))
            .unwrap(),
        Err(_) => Response::builder()
            .status(500)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Internal Server Error",
                "message": "Failed to cache country"
            })).unwrap()))
            .unwrap(),
    }
}

async fn handle_clear_country(req: Request) -> Response {
    let path = req.uri().path();
    let country_code = path.trim_start_matches("/countries/");
    
    if country_code.is_empty() || country_code.len() != 2 {
        return Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Invalid country code",
                "message": "Country code must be 2 characters"
            })).unwrap()))
            .unwrap();
    }

    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());
    
    let redis_service = match RedisService::new(&redis_url) {
        Ok(service) => Arc::new(service),
        Err(_) => {
            return Response::builder()
                .status(500)
                .header("Content-Type", "application/json")
                .body(Some(serde_json::to_vec(&serde_json::json!({
                    "error": "Service Unavailable",
                    "message": "Redis service not available"
                })).unwrap()))
                .unwrap();
        }
    };

    let cache = CountryCache::new(redis_service, Duration::from_secs(3600));
    
    match cache.clear_country_cache(country_code).await {
        Ok(_) => Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "message": "Country cache cleared successfully"
            })).unwrap()))
            .unwrap(),
        Err(_) => Response::builder()
            .status(500)
            .header("Content-Type", "application/json")
            .body(Some(serde_json::to_vec(&serde_json::json!({
                "error": "Internal Server Error",
                "message": "Failed to clear country cache"
            })).unwrap()))
            .unwrap(),
    }
}

fn handle_cors_preflight() -> Response {
    Response::builder()
        .status(200)
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
        .body(None)
        .unwrap()
}

fn get_default_country(country_code: &str) -> Country {
    match country_code.to_uppercase().as_str() {
        "ES" => Country {
            code: "ES".to_string(),
            name: "Spain".to_string(),
            flag_url: "https://flagcdn.com/es.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["es".to_string()],
            calling_code: "+34".to_string(),
        },
        "FR" => Country {
            code: "FR".to_string(),
            name: "France".to_string(),
            flag_url: "https://flagcdn.com/fr.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["fr".to_string()],
            calling_code: "+33".to_string(),
        },
        "PT" => Country {
            code: "PT".to_string(),
            name: "Portugal".to_string(),
            flag_url: "https://flagcdn.com/pt.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["pt".to_string()],
            calling_code: "+351".to_string(),
        },
        "IT" => Country {
            code: "IT".to_string(),
            name: "Italy".to_string(),
            flag_url: "https://flagcdn.com/it.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["it".to_string()],
            calling_code: "+39".to_string(),
        },
        _ => Country {
            code: country_code.to_uppercase(),
            name: get_country_name(country_code),
            flag_url: format!("https://flagcdn.com/{}.svg", country_code.to_lowercase()),
            currency: "EUR".to_string(),
            languages: vec!["en".to_string()],
            calling_code: "+34".to_string(),
        },
    }
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
    }.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_country_cache() {
        let redis = Arc::new(RedisService::new("mock://redis").unwrap());
        let cache = CountryCache::new(redis.clone(), Duration::from_secs(3600));

        let country_code = "ES";
        let country = Country {
            code: country_code.to_string(),
            name: "Spain".to_string(),
            flag_url: "https://flagcdn.com/es.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["es".to_string()],
            calling_code: "+34".to_string(),
        };

        // Test set and get
        cache
            .set_country(country_code, &country)
            .await
            .expect("Failed to set country");

        let cached_country = cache
            .get_country(country_code)
            .await
            .expect("Failed to get country");

        assert_eq!(cached_country, Some(country.clone()));

        // Test clear
        cache
            .clear_country_cache(country_code)
            .await
            .expect("Failed to clear cache");

        let empty_cache = cache
            .get_country(country_code)
            .await
            .expect("Failed to get country after clear");

        assert_eq!(empty_cache, None);
    }
}