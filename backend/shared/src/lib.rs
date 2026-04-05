#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::missing_const_for_fn
)]

// Shared types and utilities for WASM microservices
// Types are now generated from database/ folder schema definitions

pub mod config;
pub mod db;
pub mod dto;
pub mod error;
pub mod event_publisher;
pub mod events;
pub mod response;
pub mod webhook_handler;

use serde::{Deserialize, Serialize};

// Re-export common types for microservices
pub use serde_json::{json, Value as JsonValue};

// Re-export error types
pub use error::{AlbergueError, AlbergueResult};

// Re-export response types
pub use response::{ApiResponse, ErrorResponse, Status};

// Re-export DTO types at root for convenience
pub use dto::{
    BedType, BookingDto, BookingStatus, CountryInfo, DocumentType, ExtractedData, SecurityEvent,
    SecurityEventType, ValidationRequest, ValidationResponse,
};

// Common error types for all services
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceError {
    pub message: String,
    pub code: u16,
    pub details: Option<String>,
}

impl ServiceError {
    #[must_use]
    pub fn new(message: String, code: u16) -> Self {
        Self {
            message,
            code,
            details: None,
        }
    }

    #[must_use]
    pub fn message(&self) -> String {
        self.message.clone()
    }

    #[must_use]
    pub const fn code(&self) -> u16 {
        self.code
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_service_error_new() {
        let err = ServiceError::new("bad request".to_string(), 400);
        assert_eq!(err.message, "bad request");
        assert_eq!(err.code, 400);
        assert!(err.details.is_none());
    }

    #[test]
    fn test_service_error_message() {
        let err = ServiceError::new("not found".to_string(), 404);
        assert_eq!(err.message(), "not found");
    }

    #[test]
    fn test_service_error_code() {
        let err = ServiceError::new("internal".to_string(), 500);
        assert_eq!(err.code(), 500);
    }

    #[test]
    fn test_service_error_with_details() {
        let mut err = ServiceError::new("validation failed".to_string(), 422);
        err.details = Some("field 'email' is required".to_string());
        assert_eq!(err.details, Some("field 'email' is required".to_string()));
    }

    #[test]
    fn test_service_error_serialize_deserialize() {
        let err = ServiceError::new("test error".to_string(), 503);
        let json = serde_json::to_string(&err).unwrap();
        let back: ServiceError = serde_json::from_str(&json).unwrap();
        assert_eq!(back.message, "test error");
        assert_eq!(back.code, 503);
        assert!(back.details.is_none());
    }

    #[test]
    fn test_service_error_serialize_with_details() {
        let mut err = ServiceError::new("err".to_string(), 400);
        err.details = Some("details here".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("details here"));
    }

    #[test]
    fn test_service_error_clone() {
        let err = ServiceError::new("clone test".to_string(), 418);
        let cloned = err.clone();
        assert_eq!(cloned.message, err.message);
        assert_eq!(cloned.code, err.code);
    }

    #[test]
    fn test_service_error_debug() {
        let err = ServiceError::new("debug".to_string(), 500);
        let debug = format!("{err:?}");
        assert!(debug.contains("debug"));
        assert!(debug.contains("500"));
    }
}
