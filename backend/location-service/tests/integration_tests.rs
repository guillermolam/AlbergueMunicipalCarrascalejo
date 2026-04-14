use location_service::{CacheConfig, LocationService};

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_get_country_known() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let result = service.get_country_data("ES").await.unwrap();
        assert!(result.is_some());
        let country = result.unwrap();
        assert_eq!(country.code, "ES");
        assert_eq!(country.name, "Spain");
    }

    #[tokio::test]
    async fn test_get_country_unknown() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let result = service.get_country_data("INVALID").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_warm_cache() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let codes = ["ES", "FR", "PT"];
        service.warm_cache(&codes).await.unwrap();
        assert!(service.is_cached("ES"));
        assert!(service.is_cached("FR"));
        assert!(service.is_cached("PT"));
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let _ = service.get_country_data("ES").await;
        assert!(service.cache_size() > 0);
        service.clear_cache().await.unwrap();
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_clear_country_cache() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let _ = service.get_country_data("ES").await;
        assert!(service.is_cached("ES"));
        service.clear_country_cache("ES").await.unwrap();
        assert!(!service.is_cached("ES"));
    }

    #[tokio::test]
    async fn test_multiple_requests_same_country() {
        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        for _ in 0..3 {
            let result = service.get_country_data("ES").await.unwrap();
            assert!(result.is_some());
            assert_eq!(result.unwrap().code, "ES");
        }
    }

    #[tokio::test]
    async fn test_performance_multiple_requests() {
        use std::time::Instant;

        let mut service = LocationService::with_memory_cache(Some(CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(60),
        }));
        let start = Instant::now();

        for _ in 0..10 {
            let _ = service.get_country_data("ES").await.unwrap();
        }

        let duration = start.elapsed();
        assert!(
            duration.as_millis() < 1000,
            "10 requests should complete in under 1s"
        );
    }
}
