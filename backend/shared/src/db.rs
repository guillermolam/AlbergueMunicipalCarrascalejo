// Database configuration for both PostgreSQL and SQLite
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
    pub database_type: DatabaseType,
    pub connection_string: String,
    pub max_connections: u32,
    pub connection_timeout_seconds: u64,
    pub ssl_mode: SslMode,
    pub channel_binding: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum DatabaseType {
    PostgreSQL, // NeonDB with connection pooling
    SQLite,     // For Spin/Fermyon deployment
}

#[derive(Debug, Clone, PartialEq)]
pub enum SslMode {
    Require,
    Prefer,
    Disable,
}

#[cfg(target_arch = "wasm32")]
use crate::config::get_database_url;

impl DatabaseConfig {
    pub fn from_env() -> Self {
        let database_type = if std::env::var("SPIN_COMPONENT_ROUTE").is_ok() {
            DatabaseType::SQLite
        } else {
            DatabaseType::PostgreSQL
        };

        let connection_string = match database_type {
            DatabaseType::PostgreSQL => {
                // For Spin deployments, try KV store first
                #[cfg(target_arch = "wasm32")]
                {
                    match get_database_url() {
                        Ok(url) => url,
                        Err(_) => {
                            // Fallback to environment variables
                            std::env::var("DATABASE_URL")
                                .or_else(|_| std::env::var("NEON_DATABASE_URL"))
                                .unwrap_or_else(|_| "postgresql://localhost/albergue".to_string())
                        }
                    }
                }

                // For non-Spin environments, use environment variables
                #[cfg(not(target_arch = "wasm32"))]
                {
                    std::env::var("DATABASE_URL")
                        .or_else(|_| std::env::var("NEON_DATABASE_URL"))
                        .unwrap_or_else(|_| "postgresql://localhost/albergue".to_string())
                }
            }
            DatabaseType::SQLite => {
                std::env::var("SQLITE_DATABASE").unwrap_or_else(|_| "./albergue.db".to_string())
            }
        };

        // Parse SSL mode from connection string
        let ssl_mode = if connection_string.contains("sslmode=require") {
            SslMode::Require
        } else if connection_string.contains("sslmode=prefer") {
            SslMode::Prefer
        } else {
            SslMode::Disable
        };

        // Check for channel binding
        let channel_binding = connection_string.contains("channel_binding=require");

        let max_connections = if database_type == DatabaseType::PostgreSQL {
            // Higher connection limit for pooled connections
            20
        } else {
            5
        };

        Self {
            database_type,
            connection_string,
            max_connections,
            connection_timeout_seconds: 30,
            ssl_mode,
            channel_binding,
        }
    }

    pub fn is_production(&self) -> bool {
        self.connection_string.contains("pooler") && !cfg!(debug_assertions)
    }

    pub fn is_development(&self) -> bool {
        self.connection_string.contains("pooler") && cfg!(debug_assertions)
    }

    pub fn get_pool_config(&self) -> PoolConfig {
        PoolConfig {
            max_connections: self.max_connections,
            connection_timeout: std::time::Duration::from_secs(self.connection_timeout_seconds),
            ssl_mode: self.ssl_mode.clone(),
            channel_binding: self.channel_binding,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PoolConfig {
    pub max_connections: u32,
    pub connection_timeout: std::time::Duration,
    pub ssl_mode: SslMode,
    pub channel_binding: bool,
}

// Connection string utilities
impl DatabaseConfig {
    pub fn get_connection_string(&self) -> String {
        self.connection_string.clone()
    }

    pub fn get_pool_size(&self) -> u32 {
        if self.is_production() {
            // Use smaller pool size for production with connection pooling
            10
        } else if self.is_development() {
            // Use moderate pool size for development
            5
        } else {
            // Local development
            3
        }
    }

    pub fn get_connection_timeout(&self) -> std::time::Duration {
        if self.is_production() {
            // Shorter timeout for production with pooling
            std::time::Duration::from_secs(10)
        } else {
            std::time::Duration::from_secs(30)
        }
    }

    pub fn get_ssl_config(&self) -> SslConfig {
        SslConfig {
            ssl_mode: self.ssl_mode.clone(),
            channel_binding: self.channel_binding,
            verify_cert: self.ssl_mode == SslMode::Require,
        }
    }
}

#[derive(Debug, Clone)]
pub struct SslConfig {
    pub ssl_mode: SslMode,
    pub channel_binding: bool,
    pub verify_cert: bool,
}

// Environment detection helpers
impl DatabaseConfig {
    pub fn get_environment(&self) -> Environment {
        if self.is_production() {
            Environment::Production
        } else if self.is_development() {
            Environment::Development
        } else {
            Environment::Local
        }
    }

    pub fn get_database_name(&self) -> String {
        match self.database_type {
            DatabaseType::PostgreSQL => {
                // Extract database name from connection string
                if let Some(db_name) = self.connection_string.rsplit('/').next() {
                    db_name
                        .split('?')
                        .next()
                        .unwrap_or("albergue-carrascalejo")
                        .to_string()
                } else {
                    "albergue-carrascalejo".to_string()
                }
            }
            DatabaseType::SQLite => std::path::Path::new(&self.connection_string)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("albergue")
                .to_string(),
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum Environment {
    Production,
    Development,
    Local,
}

impl std::fmt::Display for Environment {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Environment::Production => write!(f, "production"),
            Environment::Development => write!(f, "development"),
            Environment::Local => write!(f, "local"),
        }
    }
}

// Database connection utilities
#[cfg(not(target_arch = "wasm32"))]
impl DatabaseConfig {
    pub async fn create_connection_pool(&self) -> Result<sqlx::PgPool, sqlx::Error> {
        if self.database_type != DatabaseType::PostgreSQL {
            return Err(sqlx::Error::Configuration(
                "Invalid database type for PostgreSQL pool".into(),
            ));
        }

        let pool_config = self.get_pool_config();

        let options = sqlx::postgres::PgPoolOptions::new()
            .max_connections(pool_config.max_connections);

        // Configure SSL for NeonDB (handled via connection string in newer sqlx versions)

        options.connect(&self.connection_string).await
    }

    pub fn validate_connection_string(&self) -> Result<(), String> {
        if self.connection_string.is_empty() {
            return Err("Connection string is empty".to_string());
        }

        match self.database_type {
            DatabaseType::PostgreSQL => {
                if !self.connection_string.starts_with("postgresql://") {
                    return Err(
                        "PostgreSQL connection string must start with postgresql://".to_string()
                    );
                }

                // Check for required SSL configuration for NeonDB
                if self.connection_string.contains("neon.tech") {
                    if !self.connection_string.contains("sslmode=require") {
                        return Err("NeonDB requires sslmode=require".to_string());
                    }
                    if !self.connection_string.contains("pooler") {
                        return Err(
                            "NeonDB connection pooling should use pooler endpoints".to_string()
                        );
                    }
                }
            }
            DatabaseType::SQLite => {
                if !self.connection_string.ends_with(".db")
                    && !self.connection_string.contains(":memory:")
                {
                    return Err("SQLite connection should end with .db or be :memory:".to_string());
                }
            }
        }

        Ok(())
    }
}

// Health check configuration
impl DatabaseConfig {
    pub fn health_check_query(&self) -> &'static str {
        match self.database_type {
            DatabaseType::PostgreSQL => "SELECT 1",
            DatabaseType::SQLite => "SELECT 1",
        }
    }

    pub fn get_health_check_timeout(&self) -> std::time::Duration {
        std::time::Duration::from_secs(5)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_database_config_from_env() {
        // Test with mock environment variables
        std::env::set_var("DATABASE_URL", "postgresql://localhost/test");
        std::env::remove_var("SPIN_COMPONENT_ROUTE");

        let config = DatabaseConfig::from_env();
        assert_eq!(config.database_type, DatabaseType::PostgreSQL);
        assert!(config.connection_string.contains("postgresql://"));
    }

    #[test]
    fn test_neondb_connection_string_validation() {
        let config = DatabaseConfig {
            database_type: DatabaseType::PostgreSQL,
            connection_string: "postgresql://user:pass@ep-frosty-paper-a2rbivma-pooler.eu-central-1.aws.neon.tech/db?sslmode=require&channel_binding=require".to_string(),
            max_connections: 10,
            connection_timeout_seconds: 30,
            ssl_mode: SslMode::Require,
            channel_binding: true,
        };

        assert!(config.validate_connection_string().is_ok());
        assert!(config.is_production());
        assert_eq!(config.get_environment(), Environment::Production);
    }

    #[test]
    fn test_development_connection_string() {
        let config = DatabaseConfig {
            database_type: DatabaseType::PostgreSQL,
            connection_string: "postgresql://user:pass@ep-odd-boat-a2k9sscv-pooler.eu-central-1.aws.neon.tech/db?sslmode=require&channel_binding=require".to_string(),
            max_connections: 10,
            connection_timeout_seconds: 30,
            ssl_mode: SslMode::Require,
            channel_binding: true,
        };

        assert!(config.validate_connection_string().is_ok());
        assert!(config.is_development());
    }
}
