use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use http::StatusCode;
use spin_sdk::http::{Request, Response, ResponseBuilder};

use crate::models::{ApiResponse, CacheConfig};
use crate::service::LocationService;
use redis_service::RedisService;

pub struct RequestHandler {
    service: Arc<tokio::sync::Mutex<LocationService>>,
}

impl Default for RequestHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl RequestHandler {
    #[allow(clippy::duration_suboptimal_units)]
    #[must_use]
    pub fn new() -> Self {
        // Initialize Redis service if available
        let redis_url =
            std::env::var("REDIS_URL")
                .ok()
                .and_then(|url| if url.is_empty() { None } else { Some(url) });

        let service = redis_url.map_or_else(
            || {
                log::warn!("Redis not configured, using in-memory cache only");
                LocationService::with_memory_cache(Some(CacheConfig::default()))
            },
            |redis_url| {
                log::info!("Initializing with Redis cache");
                let redis = RedisService::new(&redis_url).expect("Failed to create Redis service");
                let config = CacheConfig {
                    enabled: true,
                    ttl: Duration::from_secs(3600), // 1 hour TTL
                };
                LocationService::with_redis(redis, Some(config))
            },
        );

        Self {
            service: Arc::new(tokio::sync::Mutex::new(service)),
        }
    }

    /// Create a `RequestHandler` with a pre-built service (for testing).
    #[cfg(test)]
    pub fn with_service(service: Arc<tokio::sync::Mutex<LocationService>>) -> Self {
        Self { service }
    }

    pub async fn handle_request(&self, req: &Request) -> Result<Response> {
        let method = req.method();
        let path = req.path_and_query().unwrap_or("/");

        // Handle CORS preflight requests
        if matches!(method, spin_sdk::http::Method::Other(m) if m == "OPTIONS") {
            return Ok(Self::handle_cors_preflight());
        }

        let method_str = match method {
            spin_sdk::http::Method::Get => "GET",
            spin_sdk::http::Method::Post => "POST",
            spin_sdk::http::Method::Put => "PUT",
            spin_sdk::http::Method::Delete => "DELETE",
            spin_sdk::http::Method::Patch => "PATCH",
            spin_sdk::http::Method::Head => "HEAD",
            spin_sdk::http::Method::Options => "OPTIONS",
            spin_sdk::http::Method::Connect => "CONNECT",
            spin_sdk::http::Method::Trace => "TRACE",
            spin_sdk::http::Method::Other(m) => m.as_str(),
        };

        match (method_str, path) {
            ("GET", p) if p.starts_with("/api/countries/") => self.handle_get_country(p).await,
            ("POST", "/api/countries/warm-cache") => self.handle_warm_cache().await,
            ("GET", "/api/countries") => self.handle_list_countries().await,
            ("DELETE", "/api/countries/cache") => self.handle_clear_cache().await,
            ("DELETE", p) if p.starts_with("/api/countries/") => {
                self.handle_clear_country_cache(p).await
            }
            _ => Ok(Self::handle_not_found()),
        }
    }

    async fn handle_get_country(&self, path: &str) -> Result<Response> {
        let code = path.strip_prefix("/api/countries/").unwrap_or("");

        if code.is_empty() {
            return Ok(ResponseBuilder::new(StatusCode::BAD_REQUEST)
                .header("content-type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(r#"{"error":"Country code is required"}"#)
                .build());
        }

        let mut service = self.service.lock().await;
        match service.get_country_data(code).await {
            Ok(Some(country)) => {
                let response = ApiResponse::success(country);
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Failed to serialize response"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
            Ok(None) => {
                let response = ApiResponse::<()>::error("Country not found".to_string());
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Country not found"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
            Err(e) => {
                log::error!("Error getting country data: {e}");
                let response = ApiResponse::<()>::error("Internal server error".to_string());
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Internal server error"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
        }
    }

    async fn handle_warm_cache(&self) -> Result<Response> {
        let common_countries = ["ES", "FR", "PT", "IT", "DE", "GB"];
        let mut service = self.service.lock().await;
        match service.warm_cache(&common_countries).await {
            Ok(()) => {
                let response = ApiResponse::success("Cache warmed successfully");
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":true,"message":"Cache warmed successfully"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
            Err(e) => {
                log::error!("Failed to warm cache: {e}");
                let response = ApiResponse::<()>::error(format!("Failed to warm cache: {e}"));
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Failed to warm cache"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
        }
    }

    async fn handle_list_countries(&self) -> Result<Response> {
        // In a real app, you would return the list of supported countries
        let countries = vec!["ES", "FR", "DE", "IT", "PT"];

        let response = ApiResponse::success(countries);
        let body = serde_json::to_string(&response)
            .unwrap_or_else(|_| r#"{"success":true,"data":[]}"#.to_string());

        Ok(ResponseBuilder::new(StatusCode::OK)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(body)
            .build())
    }

    async fn handle_clear_cache(&self) -> Result<Response> {
        let mut service = self.service.lock().await;
        match service.clear_cache().await {
            Ok(()) => {
                let response = ApiResponse::success("Cache cleared successfully");
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":true,"message":"Cache cleared successfully"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
            Err(e) => {
                log::error!("Failed to clear cache: {e}");
                let response = ApiResponse::<()>::error(format!("Failed to clear cache: {e}"));
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Failed to clear cache"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
        }
    }

    async fn handle_clear_country_cache(&self, path: &str) -> Result<Response> {
        let code = path.strip_prefix("/api/countries/").unwrap_or("");

        if code.is_empty() {
            return Ok(ResponseBuilder::new(StatusCode::BAD_REQUEST)
                .header("content-type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(r#"{"error":"Country code is required"}"#)
                .build());
        }

        let mut service = self.service.lock().await;
        match service.clear_country_cache(code).await {
            Ok(()) => {
                let response = ApiResponse::success("Country cache cleared successfully");
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":true,"message":"Country cache cleared successfully"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
            Err(e) => {
                log::error!("Failed to clear country cache: {e}");
                let response =
                    ApiResponse::<()>::error(format!("Failed to clear country cache: {e}"));
                let body = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"success":false,"message":"Failed to clear country cache"}"#.to_string()
                });

                Ok(ResponseBuilder::new(StatusCode::INTERNAL_SERVER_ERROR)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(body)
                    .build())
            }
        }
    }

    fn handle_cors_preflight() -> Response {
        ResponseBuilder::new(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, OPTIONS",
            )
            .header(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization",
            )
            .header("Access-Control-Max-Age", "86400")
            .build()
    }

    fn handle_not_found() -> Response {
        let response = ApiResponse::<()>::error("Endpoint not found".to_string());
        ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(serde_json::to_string(&response).unwrap_or_default())
            .build()
    }
}
