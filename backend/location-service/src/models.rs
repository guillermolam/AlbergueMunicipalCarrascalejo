use serde::{Deserialize, Serialize};
use std::time::Duration;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum LocationServiceError {
    #[error("Redis error: {0}")]
    Redis(String),
    #[error("Cache error: {0}")]
    Cache(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CountryData {
    pub code: String,
    pub name: String,
    pub flag: Option<String>,
    pub phone_prefix: Option<String>,
    pub continent: Option<String>,
    pub capital: Option<String>,
    pub currency: Option<String>,
    pub languages: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub calling_code: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CountryResponse {
    pub country: String,
    pub country_code: String,
    pub calling_code: String,
    pub flag: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct CacheEntry {
    pub data: CountryData,
    pub timestamp: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            message: Some(message),
        }
    }
}

#[derive(Debug, Clone)]
pub struct CacheConfig {
    pub enabled: bool,
    pub ttl: Duration,
}

impl Default for CacheConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            ttl: Duration::from_secs(3600), // 1 hour default
        }
    }
}
