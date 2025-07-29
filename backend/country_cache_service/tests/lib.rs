use super::CountryCache;
use super::Country;
use super::CountryCacheError;
use redis_service::RedisService;
use std::sync::Arc;
use std::time::Duration;
use mockall::mock;
use thiserror::Error;

// Mock RedisService
mock! {
    RedisService {
        fn get_with_expiry<K, V>(&self, key: &str) -> Result<Option<V>, RedisServiceError> where
            K: ToString,
            V: for<'de> serde::Deserialize<'de>;

        fn set_with_expiry<K, V>(&self, key: &str, value: &V, expiry: Duration) -> Result<(), RedisServiceError> where
            K: ToString,
            V: serde::Serialize;

        fn delete_key(&self, key: &str) -> Result<(), RedisServiceError>;
    }
}

#[tokio::test]
async fn test_country_cache_get_country() {
    let mut mock_redis = MockRedisService::new();
    let country_code = "ES";
    let country = Country {
        code: "ES".to_string(),
        name: "Spain".to_string(),
        flag_url: "https://flagcdn.com/es.svg".to_string(),
        currency: "EUR".to_string(),
        languages: vec!["es".to_string()],
        calling_code: "+34".to_string(),
    };

    // Test successful get
    mock_redis
        .expect_get_with_expiry()
        .returning(|_| Ok(Some(country.clone())));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.get_country(country_code).await;
    assert!(result.is_ok());
    assert_eq!(result.unwrap().unwrap(), country);

    // Test cache miss
    let mut mock_redis = MockRedisService::new();
    mock_redis
        .expect_get_with_expiry()
        .returning(|_| Ok(None));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.get_country(country_code).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());

    // Test Redis error
    let mut mock_redis = MockRedisService::new();
    mock_redis
        .expect_get_with_expiry()
        .returning(|_| Err(RedisServiceError::ConnectionError));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.get_country(country_code).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), CountryCacheError::Redis(_)));
}

#[tokio::test]
async fn test_country_cache_set_country() {
    let mut mock_redis = MockRedisService::new();
    let country_code = "ES";
    let country = Country {
        code: "ES".to_string(),
        name: "Spain".to_string(),
        flag_url: "https://flagcdn.com/es.svg".to_string(),
        currency: "EUR".to_string(),
        languages: vec!["es".to_string()],
        calling_code: "+34".to_string(),
    };

    // Test successful set
    mock_redis
        .expect_set_with_expiry()
        .returning(|_, _, _| Ok(()));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.set_country(country_code, &country).await;
    assert!(result.is_ok());

    // Test Redis error
    let mut mock_redis = MockRedisService::new();
    mock_redis
        .expect_set_with_expiry()
        .returning(|_, _, _| Err(RedisServiceError::ConnectionError));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.set_country(country_code, &country).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), CountryCacheError::Redis(_)));
}

#[tokio::test]
async fn test_country_cache_clear_country() {
    let mut mock_redis = MockRedisService::new();
    let country_code = "ES";

    // Test successful clear
    mock_redis
        .expect_delete_key()
        .returning(|_| Ok(()));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.clear_country_cache(country_code).await;
    assert!(result.is_ok());

    // Test Redis error
    let mut mock_redis = MockRedisService::new();
    mock_redis
        .expect_delete_key()
        .returning(|_| Err(RedisServiceError::ConnectionError));

    let cache = CountryCache::new(Arc::new(mock_redis), Duration::from_secs(3600));
    let result = cache.clear_country_cache(country_code).await;
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), CountryCacheError::Redis(_)));
}
