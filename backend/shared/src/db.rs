use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// Database configuration for both PostgreSQL and SQLite
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub database_type: DatabaseType,
    pub connection_string: String,
    pub max_connections: u32,
    pub connection_timeout_seconds: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DatabaseType {
    PostgreSQL, // NeonDB for local development
    SQLite,     // For Spin/Fermyon deployment
}

impl DatabaseConfig {
    pub fn from_env() -> Self {
        let database_type = if std::env::var("SPIN_COMPONENT_ROUTE").is_ok() {
            DatabaseType::SQLite
        } else {
            DatabaseType::PostgreSQL
        };

        let connection_string = match database_type {
            DatabaseType::PostgreSQL => std::env::var("NEON_DATABASE_URL")
                .or_else(|_| std::env::var("DATABASE_URL"))
                .unwrap_or_else(|_| "postgresql://localhost/albergue".to_string()),
            DatabaseType::SQLite => {
                std::env::var("SQLITE_DATABASE").unwrap_or_else(|_| "./albergue.db".to_string())
            }
        };

        Self {
            database_type,
            connection_string,
            max_connections: 10,
            connection_timeout_seconds: 30,
        }
    }

    pub fn is_sqlite(&self) -> bool {
        self.database_type == DatabaseType::SQLite
    }

    pub fn is_postgresql(&self) -> bool {
        self.database_type == DatabaseType::PostgreSQL
    }
}

// Common database operations that work with both PostgreSQL and SQLite
pub trait DatabaseOperations {
    async fn health_check(&self) -> Result<bool, crate::AlbergueError>;
    async fn get_connection_info(&self) -> HashMap<String, String>;
}

// UUID handling for cross-database compatibility
pub fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// JSON handling for cross-database compatibility
pub fn serialize_json<T: Serialize>(data: &T) -> Result<String, crate::AlbergueError> {
    serde_json::to_string(data).map_err(|e| {
        crate::AlbergueError::DatabaseError(format!("JSON serialization failed: {}", e))
    })
}

pub fn deserialize_json<T: for<'de> Deserialize<'de>>(
    json_str: &str,
) -> Result<T, crate::AlbergueError> {
    serde_json::from_str(json_str).map_err(|e| {
        crate::AlbergueError::DatabaseError(format!("JSON deserialization failed: {}", e))
    })
}

// Date handling for cross-database compatibility
pub fn format_date(date: &chrono::NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

pub fn format_datetime(datetime: &chrono::DateTime<chrono::Utc>) -> String {
    datetime.format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn parse_date(date_str: &str) -> Result<chrono::NaiveDate, crate::AlbergueError> {
    chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .map_err(|e| crate::AlbergueError::ValidationError(format!("Invalid date format: {}", e)))
}

pub fn parse_datetime(
    datetime_str: &str,
) -> Result<chrono::DateTime<chrono::Utc>, crate::AlbergueError> {
    chrono::DateTime::parse_from_str(datetime_str, "%Y-%m-%d %H:%M:%S %z")
        .map(|dt| dt.with_timezone(&chrono::Utc))
        .or_else(|_| {
            chrono::NaiveDateTime::parse_from_str(datetime_str, "%Y-%m-%d %H:%M:%S")
                .map(|ndt| chrono::DateTime::from_naive_utc_and_offset(ndt, chrono::Utc))
        })
        .map_err(|e| {
            crate::AlbergueError::ValidationError(format!("Invalid datetime format: {}", e))
        })
}
