
use anyhow::Result;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    
    #[test]
    fn test_create_cors_headers() {
        let headers = create_cors_headers();
        
        assert!(headers.len() >= 3);
        assert!(headers.iter().any(|(k, _)| *k == "Access-Control-Allow-Origin"));
        assert!(headers.iter().any(|(k, _)| *k == "Access-Control-Allow-Methods"));
        assert!(headers.iter().any(|(k, _)| *k == "Access-Control-Allow-Headers"));
    }
    
    #[test]
    fn test_build_response_with_cors() {
        let response = build_response_with_cors(200, "application/json", "{}".to_string());
        
        assert_eq!(response.status(), 200);
        assert!(response.headers().get("access-control-allow-origin").is_some());
        assert!(response.headers().get("content-type").is_some());
    }
    
    #[test]
    fn test_match_route() {
        assert_eq!(match_route("/api/health"), Some("health"));
        assert_eq!(match_route("/api/auth/login"), Some("auth"));
        assert_eq!(match_route("/api/booking/create"), Some("booking"));
        assert_eq!(match_route("/api/reviews/list"), Some("reviews"));
        assert_eq!(match_route("/api/security/check"), Some("security"));
        assert_eq!(match_route("/api/rate-limit/check"), Some("rate_limit"));
        assert_eq!(match_route("/api/notifications/send"), Some("notifications"));
        assert_eq!(match_route("/api/location/nearby"), Some("location"));
        assert_eq!(match_route("/api/info/arrival"), Some("info"));
        assert_eq!(match_route("/api/validation/dni"), Some("validation"));
        assert_eq!(match_route("/unknown/path"), None);
        assert_eq!(match_route("/"), None);
    }
    
    #[tokio::test]
    async fn test_check_dependency_health() {
        let health = check_dependency_health("database", "/health").await;
        assert_eq!(health.name, "database");
        assert_eq!(health.status, "healthy");
        assert!(health.response_time_ms > 0);
        
        let unknown_health = check_dependency_health("unknown", "/health").await;
        assert_eq!(unknown_health.status, "unknown");
    }
    
    #[tokio::test]
    async fn test_perform_health_check() -> Result<()> {
        let health = perform_health_check().await?;
        
        assert_eq!(health.status, "ok");
        assert_eq!(health.service, "gateway-bff");
        assert_eq!(health.version, "0.1.0");
        assert!(!health.timestamp.is_empty());
        assert_eq!(health.dependencies.len(), 3);
        
        // Check all dependencies are present
        let dep_names: Vec<_> = health.dependencies.iter().map(|d| &d.name).collect();
        assert!(dep_names.contains(&&"database".to_string()));
        assert!(dep_names.contains(&&"auth0".to_string()));
        assert!(dep_names.contains(&&"external_apis".to_string()));
        
        Ok(())
    }
}
