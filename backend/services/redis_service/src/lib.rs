use redis::{Client, Commands, Connection, RedisError};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use spin_sdk::http::{Request, Response};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RedisServiceError {
    #[error("Redis connection error: {0}")]
    Connection(#[from] RedisError),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Redis operation failed: {0}")]
    Operation(String),
}

pub struct RedisService {
    client: Client,
}

impl RedisService {
    pub fn new(url: &str) -> Result<Self, RedisServiceError> {
        let client = Client::open(url)?;
        Ok(Self { client })
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
        V: Serialize,
    {
        let conn = self.get_connection().await?;
        let json = serde_json::to_string(&value)?;
        conn.set_ex(key, json, expiry.as_secs())?;
        Ok(())
    }

    pub async fn get_with_expiry<K, V>(
        &self,
        key: K,
    ) -> Result<Option<V>, RedisServiceError>
    where
        K: redis::ToRedisArgs,
        V: for<'de> Deserialize<'de>,
    {
        let conn = self.get_connection().await?;
        if let Some(json) = conn.get(key)? {
            Ok(Some(serde_json::from_str(&json)?))
        } else {
            Ok(None)
        }
    }

    pub async fn delete_key<K>(&self, key: K) -> Result<(), RedisServiceError>
    where
        K: redis::ToRedisArgs,
    {
        let conn = self.get_connection().await?;
        conn.del(key)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;
    use std::time::Duration;

    #[tokio::test]
    async fn test_set_get_with_expiry() {
        let mock = mock_redis_connection();
        let service = RedisService::new("mock://redis").unwrap();

        let key = "test_key";
        let value = "test_value";
        let expiry = Duration::from_secs(3600);

        service
            .set_with_expiry(key, value, expiry)
            .await
            .expect("Failed to set value");

        let result: Option<String> = service
            .get_with_expiry(key)
            .await
            .expect("Failed to get value");

        assert_eq!(result, Some(value.to_string()));
    }

    #[tokio::test]
    async fn test_delete_key() {
        let mock = mock_redis_connection();
        let service = RedisService::new("mock://redis").unwrap();

        let key = "test_key";

        service
            .delete_key(key)
            .await
            .expect("Failed to delete key");

        let result: Option<String> = service
            .get_with_expiry(key)
            .await
            .expect("Failed to get value");

        assert_eq!(result, None);
    }

    fn mock_redis_connection() -> Connection {
        let mut mock = mockall::mock!();
        mock.expect_set_ex()
            .withf(|key: &str, value: &str, expiry: u64| {
                key == "test_key" && value == "test_value" && expiry == 3600
            })
            .returning(|_, _, _| Ok(()));
        mock.expect_get()
            .with(eq("test_key"))
            .returning(|_| Ok(Some("test_value".to_string())));
        mock.expect_del()
            .with(eq("test_key"))
            .returning(|_| Ok(()));
        mock
    }
}
