use anyhow::Result;
use spin_sdk::http::{Request, Method};
use std::collections::HashMap;

#[cfg(test)]
mod tests {
    use anyhow::Result;
    use spin_sdk::http::{Request, Method};
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_cors_headers_present() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/health")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;

        // Check that CORS headers are present
        assert!(response.headers().get("access-control-allow-origin").is_some());
        assert!(response.headers().get("access-control-allow-methods").is_some());
        assert!(response.headers().get("access-control-allow-headers").is_some());

        Ok(())
    }

    #[tokio::test]
    async fn test_options_preflight() -> Result<()> {
        let req = Request::builder()
            .method(Method::OPTIONS)
            .uri("/api/booking/create")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Content-Type, Authorization")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;

        assert_eq!(response.status(), 200);
        assert!(response.headers().get("access-control-allow-origin").is_some());

        Ok(())
    }
}