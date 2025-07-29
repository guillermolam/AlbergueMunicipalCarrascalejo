use redis::{Client, Commands, Connection, RedisResult};
use std::time::Duration;

use crate::error::RedisServiceError;
use crate::models::{CacheEntry, RedisConfig};

pub struct RedisService {
    client: Client,
    config: RedisConfig,
}

impl RedisService {
    pub fn new(url: &str) -> Result<Self, RedisServiceError> {
        let client = Client::open(url)?;
        let config = RedisConfig::default();
        Ok(Self { client, config })
    }

    pub fn with_config(config: RedisConfig) -> Result<Self, RedisServiceError> {
        let client = Client::open(&config.url)?;
        Ok(Self { client, config })
    }

    pub async fn get_connection(&self) -> Result<Connection, RedisServiceError> {
        Ok(self.client.get_connection()?)
    }

    pub async fn set_with_expiry<K, V>(
        &self,
        key: K,
        value: V,
        expiry: Duration,
    ) -> Result<(), RedisServiceError>
    where
        K: redis::ToRedisArgs,
        V: serde::Serialize,
    {
        let conn = self.get_connection().await?;
        let json = serde_json::to_string(&value)?;
        conn.set_ex(key, json, expiry.as_secs())?;
        Ok(())
    }

    pub async fn get_with_expiry<K, V>(&self, key: K) -> Result<Option<V>, RedisServiceError>
    where
        K: redis::ToRedisArgs,
        V: serde::de::DeserializeOwned,
    {
        let conn = self.get_connection().await?;
        let result: Option<String> = conn.get(key)?;
        
        match result {
            Some(json) => {
                let value: V = serde_json::from_str(&json)?;
                Ok(Some(value))
            }
            None => Ok(None),
        }
    }

    pub async fn delete<K>(&self, key: K) -> Result<bool, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<i32> = conn.del(key);
        match result {
            Ok(count) => Ok(count > 0),
            Err(_) => Ok(false),
        }
    }

    pub async fn exists<K>(&self, key: K) -> Result<bool, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<bool> = conn.exists(key);
        Ok(result.unwrap_or(false))
    }

    pub async fn set_cache_entry<K, V>(
        &self,
        key: K,
        value: V,
        ttl: Duration,
    ) -> Result<(), RedisServiceError>
    where
        K: redis::ToRedisArgs,
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

    pub async fn get_cache_entry<K, V>(&self, key: K) -> Result<Option<CacheEntry<V>>, RedisServiceError>
    where
        K: redis::ToRedisArgs,
        V: serde::de::DeserializeOwned,
    {
        self.get_with_expiry(key).await
    }

    pub async fn increment<K>(&self, key: K) -> Result<i64, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<i64> = conn.incr(key, 1);
        Ok(result?)
    }

    pub async fn decrement<K>(&self, key: K) -> Result<i64, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<i64> = conn.decr(key, 1);
        Ok(result?)
    }

    pub async fn set_ttl<K>(&self, key: K, ttl: Duration) -> Result<bool, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<bool> = conn.expire(key, ttl.as_secs() as usize);
        Ok(result.unwrap_or(false))
    }

    pub async fn get_ttl<K>(&self, key: K) -> Result<Option<Duration>, RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        let result: RedisResult<i64> = conn.ttl(key);
        
        match result {
            Ok(ttl) if ttl > 0 => Ok(Some(Duration::from_secs(ttl as u64))),
            Ok(_) => Ok(None),
            Err(_) => Ok(None),
        }
    }

    pub async fn flush_all(&self) -> Result<(), RedisServiceError> {
        let conn = self.get_connection().await?;
        let _: RedisResult<String> = conn.flushall();
        Ok(())
    }

    pub async fn ping(&self) -> Result<String, RedisServiceError> {
        let conn = self.get_connection().await?;
        let result: RedisResult<String> = conn.ping();
        Ok(result?)
    }

    pub fn get_config(&self) -> &RedisConfig {
        &self.config
    }
}

#[cfg(test)]
impl Default for RedisService {
    fn default() -> Self {
        Self::new("redis://localhost:6379").unwrap()
    }
}