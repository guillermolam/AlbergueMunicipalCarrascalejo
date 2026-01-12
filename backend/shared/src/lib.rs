#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

// Shared types and utilities for WASM microservices
// Types are now generated from database/ folder schema definitions

pub mod config;
pub mod db;
pub mod dto;
pub mod error;

use serde::{Deserialize, Serialize};

// Re-export common types for microservices
pub use serde_json::{json, Value as JsonValue};

// Re-export error types
pub use error::{AlbergueError, AlbergueResult};

// Common error types for all services
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceError {
    pub message: String,
    pub code: u16,
    pub details: Option<String>,
}

impl ServiceError {
    pub fn new(message: String, code: u16) -> ServiceError {
        ServiceError {
            message,
            code,
            details: None,
        }
    }

    pub fn message(&self) -> String {
        self.message.clone()
    }

    pub fn code(&self) -> u16 {
        self.code
    }
}
