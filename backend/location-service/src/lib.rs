mod models;
mod service;
mod handlers;

pub use models::{ApiResponse, CacheEntry, CountryData};
pub use service::CountryService;
pub use handlers::RequestHandler;

use anyhow::Result;
use spin_sdk::http::{Request, Response};
use spin_sdk::http_component;

#[http_component]
async fn handle_request(req: Request<Vec<u8>>) -> Result<Response> {
    let response = RequestHandler::handle_request(req).await?;
    Ok(response.into_response())
}

#[cfg(test)]
mod tests {
    use super::*;
    use http::{Method, Request, StatusCode};

    #[tokio::test]
    async fn test_module_structure() {
        let service = CountryService::new();
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_handle_request_integration() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/api/countries/ES")
            .body(vec![])
            .unwrap();

        let response = handle_request(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
    }
}