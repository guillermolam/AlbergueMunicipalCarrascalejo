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
        Self::Internal {
            message: format!("Serialization error: {err}"),
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl From<sqlx::Error> for AlbergueError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(format!("{err}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_error_display() {
        let err = AlbergueError::Validation {
            message: "email is invalid".to_string(),
        };
        assert_eq!(format!("{err}"), "Validation error: email is invalid");
    }

    #[test]
    fn test_database_error_display() {
        let err = AlbergueError::DatabaseError("connection refused".to_string());
        assert_eq!(format!("{err}"), "Database error: connection refused");
    }

    #[test]
    fn test_authentication_error_display() {
        let err = AlbergueError::Authentication {
            message: "invalid token".to_string(),
        };
        assert_eq!(format!("{err}"), "Authentication error: invalid token");
    }

    #[test]
    fn test_authorization_error_display() {
        let err = AlbergueError::Authorization {
            message: "insufficient permissions".to_string(),
        };
        assert_eq!(
            format!("{err}"),
            "Authorization error: insufficient permissions"
        );
    }

    #[test]
    fn test_not_found_display() {
        let err = AlbergueError::NotFound("booking 123".to_string());
        assert_eq!(format!("{err}"), "Not found: booking 123");
    }

    #[test]
    fn test_not_implemented_display() {
        let err = AlbergueError::NotImplemented("feature X".to_string());
        assert_eq!(format!("{err}"), "Not implemented: feature X");
    }

    #[test]
    fn test_ocr_processing_error_display() {
        let err = AlbergueError::OCRProcessing {
            message: "image too blurry".to_string(),
        };
        assert_eq!(format!("{err}"), "OCR processing error: image too blurry");
    }

    #[test]
    fn test_external_service_error_display() {
        let err = AlbergueError::ExternalServiceError("timeout".to_string());
        assert_eq!(format!("{err}"), "External service error: timeout");
    }

    #[test]
    fn test_rate_limit_display() {
        let err = AlbergueError::RateLimit;
        assert_eq!(format!("{err}"), "Rate limit exceeded");
    }

    #[test]
    fn test_internal_error_display() {
        let err = AlbergueError::Internal {
            message: "unexpected panic".to_string(),
        };
        assert_eq!(format!("{err}"), "Internal server error: unexpected panic");
    }

    #[test]
    fn test_from_serde_json_error() {
        let json_err = serde_json::from_str::<String>("not valid json").unwrap_err();
        let err: AlbergueError = json_err.into();
        let msg = format!("{err}");
        assert!(msg.contains("Serialization error"));
    }

    #[test]
    fn test_albergue_error_serialize_deserialize() {
        let err = AlbergueError::Validation {
            message: "test".to_string(),
        };
        let json = serde_json::to_string(&err).unwrap();
        let back: AlbergueError = serde_json::from_str(&json).unwrap();
        assert_eq!(format!("{back}"), "Validation error: test");
    }

    #[test]
    fn test_albergue_error_debug() {
        let err = AlbergueError::RateLimit;
        let debug = format!("{err:?}");
        assert!(debug.contains("RateLimit"));
    }

    #[test]
    fn test_albergue_result_ok() {
        let result: AlbergueResult<i32> = Ok(42);
        assert!(matches!(result, Ok(42)));
    }

    #[test]
    fn test_albergue_result_err() {
        let result: AlbergueResult<i32> = Err(AlbergueError::NotFound("item".to_string()));
        assert!(result.is_err());
    }

    #[test]
    fn test_all_variants_roundtrip_serialization() {
        let variants: Vec<AlbergueError> = vec![
            AlbergueError::Validation {
                message: "v".to_string(),
            },
            AlbergueError::DatabaseError("d".to_string()),
            AlbergueError::Authentication {
                message: "a".to_string(),
            },
            AlbergueError::Authorization {
                message: "z".to_string(),
            },
            AlbergueError::NotFound("n".to_string()),
            AlbergueError::NotImplemented("ni".to_string()),
            AlbergueError::OCRProcessing {
                message: "o".to_string(),
            },
            AlbergueError::ExternalServiceError("e".to_string()),
            AlbergueError::RateLimit,
            AlbergueError::Internal {
                message: "i".to_string(),
            },
        ];
        for variant in variants {
            let json = serde_json::to_string(&variant).unwrap();
            let _back: AlbergueError = serde_json::from_str(&json).unwrap();
        }
    }
}
