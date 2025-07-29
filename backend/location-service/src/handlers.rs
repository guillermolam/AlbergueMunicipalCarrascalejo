use anyhow::Result;
use http::{Method, Request, StatusCode};
use spin_sdk::http::{IntoResponse, ResponseBuilder};

use crate::models::ApiResponse;
use crate::service::CountryService;

pub struct RequestHandler;

impl RequestHandler {
    pub async fn handle_request(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
        let method = req.method();
        let path = req.uri().path();
        let mut service = CountryService::new();

        // Handle CORS preflight requests
        if method == "OPTIONS" {
            return Ok(Self::handle_cors_preflight());
        }

        match (method.as_str(), path) {
            ("GET", path) if path.starts_with("/api/countries/") => {
                Self::handle_get_country(req, &mut service).await
            }
            ("POST", "/api/countries/warm-cache") => {
                Self::handle_warm_cache(&mut service).await
            }
            ("GET", "/api/countries") => {
                Self::handle_list_countries(&mut service).await
            }
            ("DELETE", "/api/countries/cache") => {
                Self::handle_clear_cache(&mut service).await
            }
            _ => Ok(Self::handle_not_found()),
        }
    }

    async fn handle_get_country(
        req: Request<Vec<u8>>,
        service: &mut CountryService,
    ) -> Result<impl IntoResponse> {
        let path = req.uri().path();
        let code = path.strip_prefix("/api/countries/").unwrap_or("");

        if code.is_empty() {
            return Ok(ResponseBuilder::new(StatusCode::BAD_REQUEST)
                .header("content-type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(r#"{"error":"Country code is required"}"#)
                .build());
        }

        match service.get_country_data(code).await? {
            Some(data) => {
                let response = ApiResponse::success(data);
                Ok(ResponseBuilder::new(StatusCode::OK)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .header("Cache-Control", "public, max-age=3600")
                    .body(serde_json::to_string(&response)?)
                    .build())
            }
            None => {
                let response = ApiResponse::<()>::error("Country not found".to_string());
                Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
                    .header("content-type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(serde_json::to_string(&response)?)
                    .build())
            }
        }
    }

    async fn handle_warm_cache(service: &mut CountryService) -> Result<impl IntoResponse> {
        let common_countries = ["ES", "FR", "PT", "IT", "DE", "GB"];
        service.warm_cache(&common_countries).await?;
        
        let response = ApiResponse::<()>::success("Cache warmed successfully".to_string());
        Ok(ResponseBuilder::new(StatusCode::OK)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(serde_json::to_string(&response)?)
            .build())
    }

    async fn handle_list_countries(service: &mut CountryService) -> Result<impl IntoResponse> {
        let countries = vec!["ES", "FR", "PT", "IT", "DE", "GB"];
        let mut country_list = Vec::new();
        
        for code in countries {
            if let Some(country) = service.get_country_data(code).await? {
                country_list.push(country);
            }
        }

        let response = ApiResponse::success(country_list);
        Ok(ResponseBuilder::new(StatusCode::OK)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(serde_json::to_string(&response)?)
            .build())
    }

    async fn handle_clear_cache(service: &mut CountryService) -> Result<impl IntoResponse> {
        service.clear_cache();
        
        let response = ApiResponse::<()>::success("Cache cleared successfully".to_string());
        Ok(ResponseBuilder::new(StatusCode::OK)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(serde_json::to_string(&response)?)
            .build())
    }

    fn handle_cors_preflight() -> impl IntoResponse {
        ResponseBuilder::new(StatusCode::OK)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            .header("Access-Control-Max-Age", "86400")
            .build()
    }

    fn handle_not_found() -> impl IntoResponse {
        let response = ApiResponse::<()>::error("Endpoint not found".to_string());
        ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(serde_json::to_string(&response).unwrap_or_default())
            .build()
    }
}