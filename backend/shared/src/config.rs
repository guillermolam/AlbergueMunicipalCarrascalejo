//! Configuration service using environment variables.
//!
//! In Cloudflare Workers, secrets and environment variables are set via
//! `wrangler secret put` or in `wrangler.toml` `[vars]`. They are accessed
//! through the `Env` object in the handler, which should pass values into
//! service constructors. This module provides a fallback for native builds
//! using `std::env`.

/// Retrieve a configuration value from environment variables.
#[must_use]
pub fn get(key: &str) -> Option<String> {
    std::env::var(key).ok()
}

/// Retrieve the database URL from known environment variable names.
///
/// Checks `DATABASE_URL` first, then `NEON_DATABASE_URL`.
pub fn get_database_url() -> Result<String, String> {
    std::env::var("DATABASE_URL")
        .or_else(|_| std::env::var("NEON_DATABASE_URL"))
        .map_err(|_| {
            "No database URL found in environment (DATABASE_URL or NEON_DATABASE_URL)".to_string()
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_database_url_from_env() {
        std::env::set_var("DATABASE_URL", "postgresql://localhost/test");
        let url = get_database_url().unwrap();
        assert!(url.contains("postgresql://"));
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_get_returns_none_for_missing() {
        std::env::remove_var("NONEXISTENT_KEY_12345");
        assert!(get("NONEXISTENT_KEY_12345").is_none());
    }
}
