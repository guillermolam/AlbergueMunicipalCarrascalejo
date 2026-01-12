#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

mod models;
mod service;
mod handlers;

pub use models::{ApiResponse, CacheConfig, CacheEntry, CountryData, LocationServiceError};
pub use service::{CountryCache, CountryService};
pub use handlers::RequestHandler;

use anyhow::Result;
use spin_sdk::http::{Request, Response};
use spin_sdk::http_component;

static REQUEST_HANDLER: std::sync::OnceLock<RequestHandler> = std::sync::OnceLock::new();

#[http_component]
async fn handle_request(req: Request<Vec<u8>>) -> Result<Response> {
    // Initialize the request handler on first request
    let handler = REQUEST_HANDLER.get_or_init(|| {
        log::info!("Initializing location service request handler");
        RequestHandler::new()
    });

    let response = handler.handle_request(req).await?;
    Ok(response.into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{Method, Request, StatusCode};
    use std::time::Duration;

    #[tokio::test]
    async fn test_module_structure() {
        let service = CountryService::with_memory_cache(Some(CacheConfig::default()));
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_handle_request_integration() {
        // Test with in-memory cache for testing
        let handler = RequestHandler {
            service: Arc::new(tokio::sync::Mutex::new(
                CountryService::with_memory_cache(Some(CacheConfig {
                    enabled: true,
                    ttl: Duration::from_secs(60),
                }))
            )),
        };

        // Test GET /api/countries/ES
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/ES")
            .body(vec![])
            .unwrap();

        let response = handler.handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test GET /api/countries (list countries)
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries")
            .body(vec![])
            .unwrap();

        let response = handler.handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test DELETE /api/countries/cache
        let request = Request::builder()
            .method(Method::DELETE)
            .uri("/api/countries/cache")
            .body(vec![])
            .unwrap();

        let response = handler.handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test OPTIONS (CORS preflight)
        let request = Request::builder()
            .method(Method::OPTIONS)
            .uri("/api/countries/ES")
            .body(vec![])
            .unwrap();

        let response = handler.handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        // Test 404
        let request = Request::builder()
            .method(Method::GET)
            .uri("/nonexistent")
            .body(vec![])
            .unwrap();

        let response = handler.handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
