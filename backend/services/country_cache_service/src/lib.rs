use redis_service::RedisService;
use redis_service::RedisServiceError;
use std::sync::Arc;
use std::time::Duration;
use spin_sdk::http::{Request, Response};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CountryCacheError {
    #[error("Redis error: {0}")]
    Redis(#[from] RedisServiceError),
    #[error("Cache error: {0}")]
    Cache(String),
}

pub struct CountryCache {
    redis: Arc<RedisService>,
    cache_duration: Duration,
}

impl CountryCache {
    pub fn new(redis: Arc<RedisService>, cache_duration: Duration) -> Self {
        Self {
            redis,
            cache_duration,
        }
    }

    pub async fn get_country(&self, country_code: &str) -> Result<Option<Country>, CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .get_with_expiry::<_, Country>(&key)
            .await
            .map_err(CountryCacheError::Redis)?
    }

    pub async fn set_country(&self, country_code: &str, country: &Country) -> Result<(), CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .set_with_expiry(&key, country, self.cache_duration)
            .await
            .map_err(CountryCacheError::Redis)?;
        Ok(())
    }

    pub async fn clear_country_cache(&self, country_code: &str) -> Result<(), CountryCacheError> {
        let key = format!("country:{}", country_code);
        self.redis
            .delete_key(&key)
            .await
            .map_err(CountryCacheError::Redis)?;
        Ok(())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Country {
    pub code: String,
    pub name: String,
    pub flag_url: String,
    pub currency: String,
    pub languages: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_country_cache() {
        let redis = Arc::new(RedisService::new("mock://redis").unwrap());
        let cache = CountryCache::new(redis.clone(), Duration::from_secs(3600));

        let country_code = "ES";
        let country = Country {
            code: country_code.to_string(),
            name: "Spain".to_string(),
            flag_url: "https://flagcdn.com/es.svg".to_string(),
            currency: "EUR".to_string(),
            languages: vec!["es".to_string()],
        };

        // Test set and get
        cache
            .set_country(country_code, &country)
            .await
            .expect("Failed to set country");

        let cached_country = cache
            .get_country(country_code)
            .await
            .expect("Failed to get country");

        assert_eq!(cached_country, Some(country.clone()));

        // Test clear
        cache
            .clear_country_cache(country_code)
            .await
            .expect("Failed to clear cache");

        let empty_cache = cache
            .get_country(country_code)
            .await
            .expect("Failed to get country after clear");

        assert_eq!(empty_cache, None);
    }
}
