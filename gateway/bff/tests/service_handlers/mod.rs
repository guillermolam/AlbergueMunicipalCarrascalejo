#[cfg(test)]
mod tests {
    use anyhow::Result;
    use spin_sdk::http::{Request, Method};

    #[tokio::test]
    async fn test_auth_service_handler() -> Result<()> {
        let req = Request::builder()
            .method(Method::POST)
            .uri("/api/auth/login")
            .body(vec![])
            .unwrap();

        let response = crate::auth_service::handle(&req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_booking_service_handler() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/booking/list")
            .body(vec![])
            .unwrap();

        let response = crate::booking_service::handle(&req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_reviews_service_handler() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/api/reviews/list")
            .body(vec![])
            .unwrap();

        let response = crate::reviews_service::handle(&req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_rate_limiter_service_handler() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/test")
            .body(vec![])
            .unwrap();

        let response = crate::rate_limiter_service::handle(&req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_security_service_handler() -> Result<()> {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/test")
            .body(vec![])
            .unwrap();

        let response = crate::security_service::handle(&req).await?;
        assert_eq!(response.status(), 200);

        Ok(())
    }

    #[tokio::test]
    async fn test_service_error_handling() -> Result<()> {
        // Test that services properly handle errors
        let invalid_requests = vec![
            ("/api/booking/create", Method::GET, ""), // Wrong method
            ("/api/nonexistent", Method::GET, ""), // Invalid endpoint
        ];

        for (path, method, _body) in invalid_requests {
            let req = Request::builder()
                .method(method)
                .uri(path)
                .body(vec![])
                .unwrap();

            // Test each service's error handling
            let booking_response = crate::booking_service::handle(&req).await?;
            assert!(booking_response.status() >= 400);
        }

        Ok(())
    }
}