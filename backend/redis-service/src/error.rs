use thiserror::Error;

#[derive(Error, Debug)]
pub enum RedisServiceError {
    #[error("Redis connection error: {0}")]
    Connection(String),

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
    #[must_use]
    pub const fn is_connection_error(&self) -> bool {
        matches!(self, Self::Connection(_))
    }

    #[must_use]
    pub const fn is_serialization_error(&self) -> bool {
        matches!(self, Self::Serialization(_))
    }

    #[must_use]
    pub const fn is_operation_error(&self) -> bool {
        matches!(self, Self::Operation(_))
    }
}
