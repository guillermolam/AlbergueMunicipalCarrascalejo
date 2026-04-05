use std::sync::Arc;

use worker::{Method, Request, Response, Result};

use crate::models::CacheConfig;
use crate::service::LocationService;
use shared::response::{ApiResponse, Status};

pub struct RequestHandler {
    service: Arc<std::sync::Mutex<LocationService>>,
}

impl Default for RequestHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl RequestHandler {
    #[must_use]
    pub fn new() -> Self {
        let service = LocationService::with_memory_cache(Some(CacheConfig::default()));
        Self {
            service: Arc::new(std::sync::Mutex::new(service)),
        }
    }

    #[cfg(test)]
    pub const fn with_service(service: Arc<std::sync::Mutex<LocationService>>) -> Self {
        Self { service }
    }

    pub async fn handle_request(&self, req: Request) -> Result<Response> {
        let path = req.path();

        match (req.method(), path.as_str()) {
            (Method::Get, p) if p.starts_with("/api/countries/") => {
                let code = p.strip_prefix("/api/countries/").unwrap_or("");
                self.get_country(code).await
            }
            (Method::Post, "/api/countries/warm-cache") => self.warm_cache().await,
            (Method::Get, "/api/countries") => self.list_countries(),
            (Method::Delete, "/api/countries/cache") => self.clear_cache().await,
            (Method::Delete, p) if p.starts_with("/api/countries/") => {
                let code = p.strip_prefix("/api/countries/").unwrap_or("");
                self.clear_country(code).await
            }
            _ => self.not_found(),
        }
    }

    async fn get_country(&self, code: &str) -> Result<Response> {
        if code.is_empty() {
            return self.bad_request("Country code is required");
        }

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.get_country_data(code).await {
            Ok(Some(country)) => self.json_response(&ApiResponse::success(country), Status::OK),
            Ok(None) => self.not_found_response("Country not found"),
            Err(e) => {
                log::error!("Error getting country data: {e}");
                self.internal_error("Internal server error")
            }
        }
    }

    async fn warm_cache(&self) -> Result<Response> {
        let codes = ["ES", "FR", "PT", "IT", "DE", "GB"];

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.warm_cache(&codes).await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Cache warmed successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to warm cache: {e}");
                self.internal_error("Failed to warm cache")
            }
        }
    }

    fn list_countries(&self) -> Result<Response> {
        self.json_response(
            &ApiResponse::success(["ES", "FR", "DE", "IT", "PT"]),
            Status::OK,
        )
    }

    async fn clear_cache(&self) -> Result<Response> {
        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.clear_cache().await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Cache cleared successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to clear cache: {e}");
                self.internal_error("Failed to clear cache")
            }
        }
    }

    async fn clear_country(&self, code: &str) -> Result<Response> {
        if code.is_empty() {
            return self.bad_request("Country code is required");
        }

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.clear_country_cache(code).await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Country cache cleared successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to clear country cache: {e}");
                self.internal_error("Failed to clear country cache")
            }
        }
    }

    fn not_found(&self) -> Result<Response> {
        self.not_found_response("Endpoint not found")
    }

    fn json_response<T: serde::Serialize>(&self, body: &T, status: Status) -> Result<Response> {
        let json = serde_json::to_string(body)
            .map_err(|e| worker::Error::RustError(format!("JSON serialization error: {e}")))?;
        let mut resp = Response::ok(json)?;
        let headers = resp.headers_mut();
        headers.set("Content-Type", "application/json")?;
        headers.set("Access-Control-Allow-Origin", "*")?;
        if status.code() != 200 {
            resp = resp.with_status(status.code());
        }
        Ok(resp)
    }

    fn bad_request(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::BAD_REQUEST,
        )
    }

    fn not_found_response(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::NOT_FOUND,
        )
    }

    fn internal_error(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::INTERNAL_SERVER_ERROR,
        )
    }
}
