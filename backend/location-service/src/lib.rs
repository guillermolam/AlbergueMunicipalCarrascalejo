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
pub use models::{ApiResponse, CacheConfig, CacheEntry, CountryData, LocationServiceError};
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
        let _ = service.get_country_data("ES").await;
    }
}
