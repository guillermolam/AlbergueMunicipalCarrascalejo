#[cfg(test)]
mod tests {
    use anyhow::Result;
    use spin_sdk::http::{Request, Method};

    #[tokio::test]
    async fn test_health_endpoint_routing() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/health")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_auth_endpoint_routing() -> Result<()> {
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/auth/login")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_booking_endpoint_routing() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/booking/list")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;
        // Should require auth, so either 401 or rate limited first
        assert!(response.status() == 401 || response.status() == 429 || response.status() == 403);

        Ok(())
    }

    #[tokio::test]
    async fn test_reviews_endpoint_routing() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/reviews/list")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;
        // Public endpoint, should work after rate limiting and security
        assert!(response.status() == 200 || response.status() == 429 || response.status() == 403);

        Ok(())
    }

    #[tokio::test]
    async fn test_unknown_endpoint_routing() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/unknown")
            .body(vec![])
            .unwrap();

        let response = crate::handle_request(req).await?;
        // Should eventually get 404 after middleware
        assert!(response.status() == 404 || response.status() == 429 || response.status() == 403);

        Ok(())
    }
}