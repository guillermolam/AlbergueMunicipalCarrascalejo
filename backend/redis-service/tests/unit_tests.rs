use models::{CacheEntry, RedisConfig, RedisResponse};
use redis_service::*;
use service::RedisService;
use std::time::Duration;

#[cfg(test)]
mod models_tests {
    use super::*;

    #[test]
    fn test_cache_entry_serialization() {
        let entry = CacheEntry {
            data: "test_data".to_string(),
            timestamp: 1234567890,
            ttl: 3600,
        };

        let serialized = serde_json::to_string(&entry).unwrap();
        let deserialized: CacheEntry<String> = serde_json::from_str(&serialized).unwrap();

        assert_eq!(entry.data, deserialized.data);
        assert_eq!(entry.timestamp, deserialized.timestamp);
        assert_eq!(entry.ttl, deserialized.ttl);
    }

    #[test]
    fn test_redis_config_default() {
        let config = RedisConfig::default();
        assert_eq!(config.url, "redis://localhost:6379");
        assert_eq!(config.max_connections, 10);
        assert_eq!(config.connection_timeout, 5);
        assert_eq!(config.default_ttl, 3600);
    }

    #[test]
    fn test_redis_config_custom() {
        let config = RedisConfig {
            url: "redis://custom:6380".to_string(),
            max_connections: 20,
            connection_timeout: 10,
            default_ttl: 7200,
        };

        assert_eq!(config.url, "redis://custom:6380");
        assert_eq!(config.max_connections, 20);
        assert_eq!(config.connection_timeout, 10);
        assert_eq!(config.default_ttl, 7200);
    }

    #[test]
    fn test_redis_response_success() {
        let response = RedisResponse::success("test_data");
        assert!(response.success);
        assert_eq!(response.data.unwrap(), "test_data");
        assert!(response.message.is_none());
        assert!(response.error.is_none());
    }

    #[test]
    fn test_redis_response_error() {
        let response = RedisResponse::<()>::error("Connection failed".to_string());
        assert!(!response.success);
        assert!(response.data.is_none());
        assert!(response.message.is_none());
        assert_eq!(response.error.unwrap(), "Connection failed");
    }

    #[test]
    fn test_redis_response_message() {
        let response = RedisResponse::<()>::message("Operation completed".to_string());
        assert!(response.success);
        assert!(response.data.is_none());
        assert_eq!(response.message.unwrap(), "Operation completed");
        assert!(response.error.is_none());
    }
}

#[cfg(test)]
mod service_tests {
    use super::*;

    #[test]
    fn test_redis_service_new() {
        let service = RedisService::new("redis://localhost:6379");
        assert!(service.is_ok());

        let service = service.unwrap();
        assert_eq!(service.get_config().url, "redis://localhost:6379");
    }

    #[test]
    fn test_redis_service_invalid_url() {
        let service = RedisService::new("invalid://url");
        assert!(service.is_err());
    }

    #[test]
    fn test_redis_service_with_config() {
        let config = RedisConfig {
            url: "redis://localhost:6379".to_string(),
            max_connections: 5,
            connection_timeout: 3,
            default_ttl: 1800,
        };

        let service = RedisService::with_config(config);
        assert!(service.is_ok());

        let service = service.unwrap();
        assert_eq!(service.get_config().max_connections, 5);
        assert_eq!(service.get_config().connection_timeout, 3);
        assert_eq!(service.get_config().default_ttl, 1800);
    }

    #[test]
    fn test_redis_service_default() {
        let service = RedisService::default();
        assert_eq!(service.get_config().url, "redis://localhost:6379");
    }

    #[tokio::test]
    async fn test_ping() {
        // This test requires a running Redis server
        // In a real test environment, we'd use a mock or test container
        let service = RedisService::new("redis://localhost:6379");

        if let Ok(service) = service {
            let result = service.ping().await;
            // Skip if Redis is not running
            if result.is_ok() {
                assert_eq!(result.unwrap(), "PONG");
            }
        }
    }

    #[tokio::test]
    async fn test_exists_nonexistent() {
        let service = RedisService::new("redis://localhost:6379");

        if let Ok(service) = service {
            let result = service.exists("nonexistent_key").await;
            if result.is_ok() {
                assert!(!result.unwrap());
            }
        }
    }

    #[tokio::test]
    async fn test_get_ttl_nonexistent() {
        let service = RedisService::new("redis://localhost:6379");

        if let Ok(service) = service {
            let result = service.get_ttl("nonexistent_key").await;
            if result.is_ok() {
                assert!(result.unwrap().is_none());
            }
        }
    }

    #[tokio::test]
    async fn test_delete_nonexistent() {
        let service = RedisService::new("redis://localhost:6379");

        if let Ok(service) = service {
            let result = service.delete("nonexistent_key").await;
            if result.is_ok() {
                assert!(!result.unwrap());
            }
        }
    }
}

#[cfg(test)]
mod error_tests {
    use super::*;
    use error::RedisServiceError;

    #[test]
    fn test_error_connection() {
        let error = RedisServiceError::Connection(redis::RedisError::from((
            redis::ErrorKind::TypeError,
            "Connection failed",
        )));

        assert!(error.is_connection_error());
        assert!(!error.is_serialization_error());
        assert!(!error.is_operation_error());
    }

    #[test]
    fn test_error_serialization() {
        let error =
            RedisServiceError::Serialization(serde_json::Error::custom("Serialization failed"));

        assert!(!error.is_connection_error());
        assert!(error.is_serialization_error());
        assert!(!error.is_operation_error());
    }

    #[test]
    fn test_error_operation() {
        let error = RedisServiceError::Operation("Operation failed".to_string());

        assert!(!error.is_connection_error());
        assert!(!error.is_serialization_error());
        assert!(error.is_operation_error());
    }

    #[test]
    fn test_error_display() {
        let error = RedisServiceError::Operation("Test operation".to_string());
        assert_eq!(
            format!("{}", error),
            "Redis operation failed: Test operation"
        );
    }
}
