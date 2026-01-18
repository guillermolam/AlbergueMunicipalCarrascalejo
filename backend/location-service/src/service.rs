use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use redis_service::{RedisService, RedisServiceError};

use crate::models::{CacheConfig, CacheEntry, CountryData, LocationServiceError};

#[derive(Clone)]
pub struct CountryCache {
    redis: Arc<RedisService>,
    cache_ttl: Duration,
}

impl CountryCache {
    pub fn new(redis: RedisService, cache_ttl: Duration) -> Self {
        Self {
            redis: Arc::new(redis),
            cache_ttl,
        }
    }

    pub async fn get_country(
        &self,
        country_code: &str,
    ) -> Result<Option<CountryData>, LocationServiceError> {
        let key = format!("country:{}", country_code);

        match self.redis.get(&key).await {
            Ok(Some(data)) => {
                let entry: CacheEntry = serde_json::from_str(&data).map_err(|e| {
                    LocationServiceError::Cache(format!("Failed to deserialize cache entry: {}", e))
                })?;

                let now = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| {
                    LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
                })?;

                if now.as_secs() - entry.timestamp < self.cache_ttl.as_secs() {
                    return Ok(Some(entry.data));
                }
                // Cache entry expired, fall through to return None
            }
            Err(e) => {
                log::warn!("Failed to get country from cache: {}", e);
                // Continue to return None on cache miss
            }
            _ => {}
        }

        Ok(None)
    }

    pub async fn set_country(
        &self,
        country_code: &str,
        country: &CountryData,
    ) -> Result<(), LocationServiceError> {
        let key = format!("country:{}", country_code);
        let entry = CacheEntry {
            data: country.clone(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|_| {
                    LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
                })?
                .as_secs(),
        };

        let serialized = serde_json::to_string(&entry).map_err(|e| {
            LocationServiceError::Cache(format!("Failed to serialize cache entry: {}", e))
        })?;

        self.redis
            .set_with_ttl(&key, &serialized, self.cache_ttl.as_secs() as u64)
            .await
            .map_err(|e| LocationServiceError::Redis(e.to_string()))?;

        Ok(())
    }

    pub async fn clear_country_cache(
        &self,
        country_code: &str,
    ) -> Result<(), LocationServiceError> {
        let key = format!("country:{}", country_code);
        self.redis
            .delete_key(&key)
            .await
            .map_err(|e| LocationServiceError::Redis(e.to_string()))?;
        Ok(())
    }
}

pub struct LocationService {
    memory_cache: HashMap<String, CacheEntry>,
    redis_cache: Option<CountryCache>,
    cache_config: CacheConfig,
}

impl LocationService {
    /// Create a new LocationService with default configuration
    pub fn new() -> Self {
        Self {
            memory_cache: HashMap::new(),
            redis_cache: None,
            cache_config: CacheConfig::default(),
        }
    }

    /// Create a new LocationService with Redis caching
    pub fn with_redis(redis: RedisService, cache_config: Option<CacheConfig>) -> Self {
        let config = cache_config.unwrap_or_default();
        Self {
            memory_cache: HashMap::new(),
            redis_cache: Some(CountryCache::new(redis, config.ttl)),
            cache_config: config,
        }
    }

    /// Create a new LocationService with memory caching only
    pub fn with_memory_cache(cache_config: Option<CacheConfig>) -> Self {
        let config = cache_config.unwrap_or_default();
        Self {
            memory_cache: HashMap::new(),
            redis_cache: None,
            cache_config: config,
        }
    }

    /// Get country data by country code
    pub async fn get_country_data(
        &mut self,
        code: &str,
    ) -> Result<Option<CountryData>, LocationServiceError> {
        let code = code.to_uppercase();

        // Check Redis cache first if enabled
        if let Some(redis_cache) = &self.redis_cache {
            match redis_cache.get_country(&code).await {
                Ok(Some(cached)) => return Ok(Some(cached)),
                Err(e) => log::warn!("Redis cache error: {}", e),
                _ => {}
            }
        }

        // Check in-memory cache if Redis is not available or cache miss
        if let Some(entry) = self.memory_cache.get(&code) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|_| {
                    LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
                })?
                .as_secs();

            if now - entry.timestamp < self.cache_config.ttl.as_secs() {
                return Ok(Some(entry.data.clone()));
            }
        }

        // Get country data from the data source
        let country_data = self.get_country_from_source(&code).await?;

        // Update all caches with new data
        self.update_caches(&code, &country_data).await?;

        Ok(country_data)
    }

    /// Get country data from the primary data source
    async fn get_country_from_source(
        &self,
        code: &str,
    ) -> Result<Option<CountryData>, LocationServiceError> {
        // This is a simplified example - in a real application, you would fetch from a database or API
        match code.as_str() {
            "ES" => Ok(Some(CountryData {
                code: "ES".to_string(),
                name: "Spain".to_string(),
                flag: Some("🇪🇸".to_string()),
                phone_prefix: Some("+34".to_string()),
                calling_code: Some("+34".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Madrid".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Spanish".to_string()],
            })),
            // Add more countries as needed
            _ => Ok(None),
        }
    }

    /// Update all caches with new data
    async fn update_caches(
        &mut self,
        code: &str,
        data: &CountryData,
    ) -> Result<(), LocationServiceError> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| {
                LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
            })?
            .as_secs();

        let entry = CacheEntry {
            data: data.clone(),
            timestamp,
        };

        // Update in-memory cache
        self.memory_cache.insert(code.to_string(), entry.clone());

        // Update Redis cache if enabled
        if let Some(redis_cache) = &self.redis_cache {
            if let Err(e) = redis_cache.set_country(code, data).await {
                log::error!("Failed to update Redis cache: {}", e);
            }
        }

        Ok(())
    }

    /// Warm up the cache with the given country codes
    pub async fn warm_cache(&mut self, codes: &[&str]) -> Result<(), LocationServiceError> {
        for code in codes {
            self.get_country_data(code).await?;
        }
        Ok(())
    }

    /// Clear all caches
    pub async fn clear_cache(&mut self) -> Result<(), LocationServiceError> {
        self.memory_cache.clear();

        if let Some(redis_cache) = &self.redis_cache {
            // In a real implementation, you might want to clear all country keys
            // This is a simplified version that doesn't clear the entire Redis cache
            log::info!("Memory cache cleared. Note: Redis cache was not cleared to avoid affecting other services.");
        } else {
            log::info!("Memory cache cleared");
        }

        Ok(())
    }

    /// Clear cache for a specific country
    pub async fn clear_country_cache(
        &self,
        country_code: &str,
    ) -> Result<(), LocationServiceError> {
        let code = country_code.to_uppercase();

        // Clear from memory cache
        self.memory_cache.remove(&code);

        // Clear from Redis if enabled
        if let Some(redis_cache) = &self.redis_cache {
            redis_cache.clear_country_cache(&code).await?;
        }

        Ok(())
    }

    /// Get the number of items in the in-memory cache
    pub fn cache_size(&self) -> usize {
        self.memory_cache.len()
    }

    /// Check if a country is cached (in-memory only)
    pub fn is_cached(&self, code: &str) -> bool {
        if let Some(entry) = self.memory_cache.get(&code.to_uppercase()) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .ok()
                .map(|d| d.as_secs())
                .unwrap_or(0);
            now - entry.timestamp < self.cache_config.ttl.as_secs()
        } else {
            false
        }
    }
}

#[cfg(test)]
impl Default for LocationService {
    fn default() -> Self {
        Self::new()
    }
}
