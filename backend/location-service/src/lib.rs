#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::same_length_and_capacity,
    clippy::unused_async,
    clippy::future_not_send,
    clippy::await_holding_lock,
    clippy::unused_self
)]

mod handlers;
mod models;
mod service;

pub use handlers::RequestHandler;
pub use models::{ApiResponse, AutocompleteSuggestion, CacheConfig, CacheEntry, CountryData, LocationServiceError};
pub use service::LocationService;

use worker::{event, Context, Env, Request, Response, Result};

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let handler = RequestHandler::new();
    handler.handle_request(req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use worker::Method;

    #[tokio::test]
    async fn test_module_structure() {
        let service = LocationService::with_memory_cache(Some(CacheConfig::default()));
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_service() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        assert_eq!(service.cache_size(), 0, "Cache should be empty initially");
        
        let response = service.get_country_data("ES").await;
        assert!(response.is_ok(), "Expected successful response for valid country code");
        
        let handler = RequestHandler::new();
        let valid_request = Request::new("http://example.com/api/countries/ES", Method::Get)
            .expect("Failed to create request");
        let valid_response = handler.handle_request(valid_request).await
            .expect("Handler failed");
        assert_eq!(valid_response.status_code(), 200, "Expected 200 OK for valid country endpoint");
        
        let invalid_request = Request::new("http://example.com/nonexistent", Method::Get)
            .expect("Failed to create request");
        let invalid_response = handler.handle_request(invalid_request).await
            .expect("Handler should not panic on 404");
        assert_eq!(invalid_response.status_code(), 404, "Expected 404 Not Found for invalid route");
    }
}
