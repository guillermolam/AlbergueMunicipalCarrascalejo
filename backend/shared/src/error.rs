use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum AlbergueError {
    #[error("Validation error: {message}")]
    Validation { message: String },

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Authentication error: {message}")]
    Authentication { message: String },

    #[error("Authorization error: {message}")]
    Authorization { message: String },

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Not implemented: {0}")]
    NotImplemented(String),

    #[error("OCR processing error: {message}")]
    OCRProcessing { message: String },

    #[error("External service error: {0}")]
    ExternalServiceError(String),

    #[error("Rate limit exceeded")]
    RateLimit,

    #[error("Internal server error: {message}")]
    Internal { message: String },
}

pub type AlbergueResult<T> = Result<T, AlbergueError>;

impl From<serde_json::Error> for AlbergueError {
    fn from(err: serde_json::Error) -> Self {
        AlbergueError::Internal {
            message: format!("Serialization error: {}", err),
        }
    }
}
