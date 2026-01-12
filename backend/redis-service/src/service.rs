use std::time::Duration;
use spin_sdk::redis::{self, RedisParameter, RedisResult};

use crate::error::RedisServiceError;
use crate::models::{CacheEntry, RedisConfig};

#[derive(Clone)]
pub struct RedisService {
    address: String,
    config: RedisConfig,
}

impl RedisService {
    pub fn new(url: &str) -> Result<Self, RedisServiceError> {
        let config = RedisConfig {
            url: url.to_string(),
            ..RedisConfig::default()
        };
        Ok(Self {
            address: url.to_string(),
            config,
        })
    }

    pub fn with_config(config: RedisConfig) -> Result<Self, RedisServiceError> {
        Ok(Self {
            address: config.url.clone(),
            config,
        })
    }

    // Note: Methods are marked async to maintain API compatibility with consumers,
    // even though spin-sdk redis calls are blocking FFI calls in the current version.

    pub async fn get_connection(&self) -> Result<(), RedisServiceError> {
        // No-op for Spin SDK as connections are managed by the host
        Ok(())
    }

    pub async fn set_with_expiry<K, V>(
        &self,
        key: K,
        value: V,
        expiry: Duration,
    ) -> Result<(), RedisServiceError>
    where
        K: AsRef<str>,
        V: serde::Serialize,
    {
        let key_str = key.as_ref();
        let json = serde_json::to_string(&value)?;
        let seconds = expiry.as_secs().to_string();

        // Use execute to perform SET with EX (expiry) option
        redis::execute(
            &self.address,
            "SET",
            &[
                redis::RedisParameter::Binary(key_str.as_bytes().to_vec()),
                redis::RedisParameter::Binary(json.into_bytes()),
                redis::RedisParameter::Binary("EX".as_bytes().to_vec()),
                redis::RedisParameter::Binary(seconds.into_bytes()),
            ],
        )
        .map_err(|e| RedisServiceError::Operation(format!("Failed to set key: {:?}", e)))?;

        Ok(())
    }

    pub async fn get_with_expiry<K, V>(&self, key: K) -> Result<Option<V>, RedisServiceError>
    where
        K: AsRef<str>,
        V: serde::de::DeserializeOwned,
    {
        let key_str = key.as_ref();

        // Using standard redis::get for simplicity.
        match redis::get(&self.address, key_str) {
            Ok(bytes) => {
                if bytes.is_empty() {
                    return Ok(None);
                }
                match serde_json::from_slice(&bytes) {
                    Ok(val) => Ok(Some(val)),
                    Err(_) => Ok(None),
                }
            }
            Err(_) => Ok(None),
        }
    }

    pub async fn delete<K>(&self, key: K) -> Result<bool, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        let count = redis::del(&self.address, &[key_str])
            .map_err(|e| RedisServiceError::Operation(format!("Failed to delete key: {:?}", e)))?;
        Ok(count > 0)
    }

    pub async fn exists<K>(&self, key: K) -> Result<bool, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        let result = redis::execute(
            &self.address,
            "EXISTS",
            &[redis::RedisParameter::Binary(key_str.as_bytes().to_vec())],
        )
        .map_err(|e| RedisServiceError::Operation(format!("Failed to check existence: {:?}", e)))?;

        if let Some(first) = result.first() {
            match first {
                redis::RedisResult::Int64(val) => Ok(val > 0),
                _ => Ok(false),
            }
        } else {
            Ok(false)
        }
    }

    pub async fn set_cache_entry<K, V>(
        &self,
        key: K,
        value: V,
        ttl: Duration,
    ) -> Result<(), RedisServiceError>
    where
        K: AsRef<str>,
        V: serde::Serialize,
    {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let entry = CacheEntry {
            data: value,
            timestamp,
            ttl: ttl.as_secs(),
        };

        self.set_with_expiry(key, entry, ttl).await
    }

    pub async fn get_cache_entry<K, V>(
        &self,
        key: K,
    ) -> Result<Option<CacheEntry<V>>, RedisServiceError>
    where
        K: AsRef<str>,
        V: serde::de::DeserializeOwned,
    {
        self.get_with_expiry(key).await
    }

    pub async fn increment<K>(&self, key: K) -> Result<i64, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        redis::incr(&self.address, key_str)
            .map_err(|e| RedisServiceError::Operation(format!("Failed to incr: {:?}", e)))
    }

    pub async fn decrement<K>(&self, key: K) -> Result<i64, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        let result = redis::execute(
            &self.address,
            "DECR",
            &[redis::RedisParameter::Binary(key_str.as_bytes().to_vec())],
        )
        .map_err(|e| RedisServiceError::Operation(format!("Failed to decr: {:?}", e)))?;

        if let Some(first) = result.first() {
            match first {
                redis::RedisResult::Int64(val) => Ok(val),
                _ => Err(RedisServiceError::Operation(
                    "Unexpected response type".to_string(),
                )),
            }
        } else {
            Err(RedisServiceError::Operation("No response".to_string()))
        }
    }

    pub async fn set_ttl<K>(&self, key: K, ttl: Duration) -> Result<bool, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        let seconds = ttl.as_secs().to_string();
        let result = redis::execute(
            &self.address,
            "EXPIRE",
            &[
                redis::RedisParameter::Binary(key_str.as_bytes().to_vec()),
                redis::RedisParameter::Binary(seconds.into_bytes()),
            ],
        )
        .map_err(|e| RedisServiceError::Operation(format!("Failed to set ttl: {:?}", e)))?;

        if let Some(first) = result.first() {
            match first {
                redis::RedisResult::Int64(val) => Ok(val > 0),
                _ => Ok(false),
            }
        } else {
            Ok(false)
        }
    }

    pub async fn get_ttl<K>(&self, key: K) -> Result<Option<Duration>, RedisServiceError>
    where
        K: AsRef<str>,
    {
        let key_str = key.as_ref();
        let result = redis::execute(
            &self.address,
            "TTL",
            &[redis::RedisParameter::Binary(key_str.as_bytes().to_vec())],
        )
        .map_err(|e| RedisServiceError::Operation(format!("Failed to get ttl: {:?}", e)))?;

        if let Some(first) = result.first() {
            match first {
                redis::RedisResult::Int64(val) => {
                    let v = val;
                    if v > 0 {
                        Ok(Some(Duration::from_secs(v as u64)))
                    } else {
                        Ok(None)
                    }
                }
                _ => Ok(None),
            }
        } else {
            Ok(None)
        }
    }

    pub async fn flush_all(&self) -> Result<(), RedisServiceError> {
        redis::execute(&self.address, "FLUSHALL", &[])
            .map_err(|e| RedisServiceError::Operation(format!("Failed to flush: {:?}", e)))?;
        Ok(())
    }

    pub async fn ping(&self) -> Result<String, RedisServiceError> {
        let result = redis::execute(&self.address, "PING", &[])
            .map_err(|e| RedisServiceError::Operation(format!("Failed to ping: {:?}", e)))?;

        if let Some(first) = result.first() {
            match first {
                redis::RedisResult::Status(s) => Ok(s.clone()),
                redis::RedisResult::Binary(b) => Ok(String::from_utf8_lossy(&b).to_string()),
                _ => Ok("PONG".to_string()),
            }
        } else {
            Ok("PONG".to_string())
        }
    }

    pub fn get_config(&self) -> &RedisConfig {
        &self.config
    }
}
