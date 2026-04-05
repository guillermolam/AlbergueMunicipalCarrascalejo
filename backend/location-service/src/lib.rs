#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::same_length_and_capacity,
    clippy::unused_async,
    clippy::future_not_send
)]

mod handlers;
mod models;
mod service;

pub use handlers::RequestHandler;
pub use models::{ApiResponse, CacheConfig, CacheEntry, CountryData, LocationServiceError};
pub use service::{CountryCache, LocationService};

use spin_sdk::http::{Request, Response};
use spin_sdk::http_component;

static REQUEST_HANDLER: std::sync::OnceLock<RequestHandler> = std::sync::OnceLock::new();

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<Response> {
    // Initialize the request handler on first request
    let handler = REQUEST_HANDLER.get_or_init(|| {
        log::info!("Initializing location service request handler");
        RequestHandler::new()
    });

    handler.handle_request(&req).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_module_structure() {
        let service = LocationService::with_memory_cache(Some(CacheConfig::default()));
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_handle_request_integration() {
        // Test with in-memory cache for testing
        let handler = RequestHandler::with_service(Arc::new(tokio::sync::Mutex::new(
            LocationService::with_memory_cache(Some(CacheConfig {
                enabled: true,
                ttl: std::time::Duration::from_secs(60),
            })),
        )));

        // Test GET /api/countries/ES
        let request = http::Request::builder()
            .method(http::Method::GET)
            .uri("/api/countries/ES")
            .body(Vec::<u8>::new())
            .unwrap();
        let spin_req =
            spin_sdk::http::Request::new(spin_sdk::http::Method::Get, request.uri().to_string());
        let response = handler.handle_request(&spin_req).await.unwrap();
        // Just verify it doesn't panic

        // Test GET /api/countries (list countries)
        let spin_req =
            spin_sdk::http::Request::new(spin_sdk::http::Method::Get, "/api/countries".to_string());
        let _response = handler.handle_request(&spin_req).await.unwrap();

        // Test DELETE /api/countries/cache
        let spin_req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Delete,
            "/api/countries/cache".to_string(),
        );
        let _response = handler.handle_request(&spin_req).await.unwrap();

        // Test OPTIONS (CORS preflight)
        let spin_req = spin_sdk::http::Request::new(
            spin_sdk::http::Method::Other("OPTIONS".to_string()),
            "/api/countries/ES".to_string(),
        );
        let _response = handler.handle_request(&spin_req).await.unwrap();

        // Test 404
        let spin_req =
            spin_sdk::http::Request::new(spin_sdk::http::Method::Get, "/nonexistent".to_string());
        let _response = handler.handle_request(&spin_req).await.unwrap();
    }
}
