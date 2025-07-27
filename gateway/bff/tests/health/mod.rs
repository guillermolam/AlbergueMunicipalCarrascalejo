
use anyhow::Result;
use spin_sdk::http::{Request, Method};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    use crate::integration::create_test_request;
    
    #[tokio::test]
    async fn test_health_endpoint_response_structure() -> Result<()> {
        let req = create_test_request(Method::GET, "/api/health", vec![]);
        let response = handle_request(req).await?;
        
        assert_eq!(response.status(), 200);
        assert_eq!(
            response.headers().get("content-type").unwrap().to_str().unwrap(),
            "application/json"
        );
        
        let body = response.body();
        let health_status: HealthStatus = serde_json::from_slice(body)?;
        
        assert_eq!(health_status.status, "ok");
        assert_eq!(health_status.service, "gateway-bff");
        assert_eq!(health_status.version, "0.1.0");
        assert!(!health_status.timestamp.is_empty());
        assert_eq!(health_status.dependencies.len(), 3);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_health_check_concurrency() -> Result<()> {
        // Test multiple concurrent health checks
        let mut handles = vec![];
        
        for _ in 0..5 {
            let handle = tokio::spawn(async {
                let req = create_test_request(Method::GET, "/api/health", vec![]);
                handle_request(req).await
            });
            handles.push(handle);
        }
        
        for handle in handles {
            let response = handle.await??;
            assert_eq!(response.status(), 200);
        }
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_health_check_dependencies_timing() -> Result<()> {
        let health = perform_health_check().await?;
        
        for dep in health.dependencies {
            assert!(dep.response_time_ms > 0);
            assert!(dep.response_time_ms < 1000); // Should be fast in test
            assert!(!dep.name.is_empty());
            assert!(!dep.status.is_empty());
        }
        
        Ok(())
    }
}
