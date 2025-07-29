use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CacheEntry<T> {
    pub data: T,
    pub timestamp: u64,
    pub ttl: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RedisConfig {
    pub url: String,
    pub max_connections: u32,
    pub connection_timeout: u64,
    pub default_ttl: u64,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: "redis://localhost:6379".to_string(),
            max_connections: 10,
            connection_timeout: 5,
            default_ttl: 3600,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RedisResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

impl<T> RedisResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
            error: None,
        }
    }

    pub fn error(error: String) -> Self {
        Self {
            success: false,
            data: None,
            message: None,
            error: Some(error),
        }
    }

    pub fn message(message: String) -> Self {
        Self {
            success: true,
            data: None,
            message: Some(message),
            error: None,
        }
    }
}