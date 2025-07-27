use super::super::{
    apply_authentication, apply_rate_limiting, apply_security_scanning, 
    build_response_with_cors, create_cors_headers, extract_client_id,
    requires_authentication, MiddlewareContext
};
use anyhow::Result;
use spin_sdk::http::{Request, Method};
use speculoos::prelude::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_create_cors_headers() -> Result<()> {
        let headers = create_cors_headers();

        assert_that(&headers.len()).is_greater_than(0);
        assert_that(&headers).contains(&("Access-Control-Allow-Origin", "*"));
        assert_that(&headers).contains(&("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"));

        Ok(())
    }

    #[tokio::test]
    async fn test_build_response_with_cors() -> Result<()> {
        let response = build_response_with_cors(200, "application/json", "{}".to_string());

        assert_that(&response.status()).is_equal_to(200);
        assert_that(&response.headers().get("Access-Control-Allow-Origin")).is_some();

        Ok(())
    }

    #[tokio::test]
    async fn test_extract_client_id() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/test")
            .header("x-forwarded-for", "192.168.1.1")
            .body(vec![])
            .unwrap();

        let client_id = extract_client_id(&req);
        assert_that(&client_id).is_equal_to("192.168.1.1".to_string());

        Ok(())
    }

    #[tokio::test]
    async fn test_requires_authentication() -> Result<()> {
        assert_that(&requires_authentication("/api/booking/create")).is_true();
        assert_that(&requires_authentication("/api/admin/dashboard")).is_true();
        assert_that(&requires_authentication("/api/reviews/list")).is_false();
        assert_that(&requires_authentication("/api/health")).is_false();

        Ok(())
    }

    #[tokio::test]
    async fn test_middleware_context_creation() -> Result<()> {
        let context = MiddlewareContext {
            client_id: "test-client".to_string(),
            endpoint: "/api/test".to_string(),
            method: "GET".to_string(),
            user_id: None,
            permissions: Vec::new(),
        };

        assert_that(&context.client_id).is_equal_to("test-client".to_string());
        assert_that(&context.endpoint).is_equal_to("/api/test".to_string());
        assert_that(&context.method).is_equal_to("GET".to_string());

        Ok(())
    }
}