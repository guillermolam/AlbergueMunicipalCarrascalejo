use crate::{compose_services, handle_health_check};
use anyhow::Result;
use spin_sdk::http::{IntoResponse, Method, Request, RequestBuilder};
use speculoos::prelude::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_health_check_endpoint() -> Result<()> {
        let response = handle_health_check().await?;

        assert_that(&response.status()).is_equal_to(200);

        let body = std::str::from_utf8(response.body()).unwrap();
        let health_data: serde_json::Value = serde_json::from_str(body)?;

        assert_that(&health_data["status"].as_str()).is_equal_to(Some("healthy"));
        assert_that(&health_data["service"].as_str()).is_equal_to(Some("gateway-bff"));

        Ok(())
    }

    #[tokio::test]
    async fn test_service_composition_health_check() -> Result<()> {
        let req = Request::new(Method::Get, "/api/health");

        let response = compose_services(req).await?;

        assert_that(&response.status()).is_equal_to(200);

        Ok(())
    }

    #[tokio::test]
    async fn test_service_composition_cors_options() -> Result<()> {
        let req = Request::new(Method::Options, "/api/booking/create");

        let response = compose_services(req).await?;

        assert_that(&response.status()).is_equal_to(200);
        assert_that(&response.headers().get("Access-Control-Allow-Origin")).is_some();

        Ok(())
    }

    #[tokio::test]
    async fn test_service_composition_not_found() -> Result<()> {
        let req = Request::new(Method::Get, "/api/nonexistent");

        let response = compose_services(req).await?;

        assert_that(&response.status()).is_equal_to(404);

        let body = std::str::from_utf8(response.body()).unwrap();
        let error_data: serde_json::Value = serde_json::from_str(body)?;

        assert_that(&error_data["error"].as_str()).is_equal_to(Some("Not Found"));

        Ok(())
    }
}