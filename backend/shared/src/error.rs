use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum AlbergueError {
    #[error("Validation error: {message}")]
    Validation { message: String },

    #[error("Database error: {message}")]
    Database { message: String },

    #[error("Authentication error: {message}")]
    Authentication { message: String },

    #[error("Authorization error: {message}")]
    Authorization { message: String },

    #[error("Not found: {resource}")]
    NotFound { resource: String },

    #[error("OCR processing error: {message}")]
    OCRProcessing { message: String },

    #[error("External service error: {service}: {message}")]
    ExternalService { service: String, message: String },

    #[error("Rate limit exceeded")]
    RateLimit,

    #[error("Internal server error: {message}")]
    Internal { message: String },
}

pub type AlbergueResult<T> = Result<T, AlbergueError>;
