use thiserror::Error;

#[derive(Error, Debug)]
pub enum RedisServiceError {
    #[error("Redis connection error: {0}")]
    Connection(#[from] redis::RedisError),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
    
    #[error("Redis operation failed: {0}")]
    Operation(String),
    
    #[error("Connection pool error: {0}")]
    PoolError(String),
    
    #[error("Timeout error: {0}")]
    Timeout(String),
    
    #[error("Invalid configuration: {0}")]
    ConfigError(String),
}

impl RedisServiceError {
    pub fn is_connection_error(&self) -> bool {
        matches!(self, RedisServiceError::Connection(_))
    }

    pub fn is_serialization_error(&self) -> bool {
        matches!(self, RedisServiceError::Serialization(_))
    }

    pub fn is_operation_error(&self) -> bool {
        matches!(self, RedisServiceError::Operation(_))
    }
}