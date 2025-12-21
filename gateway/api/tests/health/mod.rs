#[cfg(test)]
mod tests {
    use anyhow::Result;
    use serde_json::Value;
    use spin_sdk::http::{Method, Request};

    // Helper function to create test requests
    fn create_test_request(
        method: Method,
        path: &str,
        headers: Vec<(&str, &str)>,
    ) -> Request<Vec<u8>> {
        let mut builder = Request::builder().method(method).uri(path);

        for (key, value) in headers {
            builder = builder.header(key, value);
        }

        builder.body(vec![]).unwrap()
    }

    #[tokio::test]
    async fn test_health_endpoint_response_structure() -> Result<()> {
        let req = create_test_request(Method::GET, "/api/health", vec![]);
        let response = crate::handle_health_check().await?;

        assert_eq!(response.status(), 200);
        assert_eq!(
            response
                .headers()
                .get("content-type")
                .unwrap()
                .to_str()
                .unwrap(),
            "application/json"
        );

        let body = std::str::from_utf8(response.body())?;
        let health_status: Value = serde_json::from_str(body)?;

        assert_eq!(health_status["status"], "healthy");
        assert_eq!(health_status["service"], "gateway-bff");
        assert_eq!(health_status["version"], "0.1.0");
        assert!(health_status["timestamp"].is_string());
        assert!(health_status["services"].is_object());
        assert!(health_status["middleware"].is_object());
        assert!(health_status["service_composition"].is_object());

        Ok(())
    }

    #[tokio::test]
    async fn test_health_check_concurrency() -> Result<()> {
        // Test multiple concurrent health checks
        let mut handles = vec![];

        for _ in 0..5 {
            let handle = tokio::spawn(async { crate::handle_health_check().await });
            handles.push(handle);
        }

        for handle in handles {
            let response = handle.await??;
            assert_eq!(response.status(), 200);

            let body = std::str::from_utf8(response.body())?;
            let health_status: Value = serde_json::from_str(body)?;
            assert_eq!(health_status["status"], "healthy");
        }

        Ok(())
    }

    #[tokio::test]
    async fn test_health_endpoint_middleware_status() -> Result<()> {
        let response = crate::handle_health_check().await?;
        let body = std::str::from_utf8(response.body())?;
        let health_status: Value = serde_json::from_str(body)?;

        // Check middleware status
        let middleware = &health_status["middleware"];
        assert_eq!(middleware["rate_limiting"], "active");
        assert_eq!(middleware["security_scanning"], "active");
        assert_eq!(middleware["authentication"], "active");

        Ok(())
    }

    #[tokio::test]
    async fn test_health_endpoint_service_composition() -> Result<()> {
        let response = crate::handle_health_check().await?;
        let body = std::str::from_utf8(response.body())?;
        let health_status: Value = serde_json::from_str(body)?;

        // Check service composition configuration
        let composition = &health_status["service_composition"];
        assert!(composition["pipeline"].is_array());
        assert!(composition["oauth2_flows"].is_array());
        assert_eq!(composition["openid_connect"], "enabled");

        Ok(())
    }
}
