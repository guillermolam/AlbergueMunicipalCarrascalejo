use shared::AlbergueResult;

pub fn init_logging() {
    tracing_subscriber::fmt()
        .with_env_filter(std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()))
        .init();
}

pub struct InfoServiceConfig {
    pub database_url: String,
    pub cache_duration_hours: i32,
    pub scraping_enabled: bool,
    pub default_language: String,
}

impl InfoServiceConfig {
    pub fn from_env() -> AlbergueResult<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")
                .or_else(|_| std::env::var("NEON_DATABASE_URL"))
                .unwrap_or_else(|_| "sqlite://./albergue.db".to_string()),
            cache_duration_hours: std::env::var("CACHE_DURATION_HOURS")
                .unwrap_or_else(|_| "24".to_string())
                .parse()
                .unwrap_or(24),
            scraping_enabled: std::env::var("SCRAPING_ENABLED")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            default_language: std::env::var("DEFAULT_LANGUAGE")
                .unwrap_or_else(|_| "es".to_string()),
        })
    }
}
