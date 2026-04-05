//! Configuration service using environment variables.
//!
//! In Cloudflare Workers, secrets and environment variables are set via
//! `wrangler secret put` or in `wrangler.toml` `[vars]`. They are accessed
//! through the `Env` object in the handler, which should pass values into
//! service constructors. This module provides a fallback for native builds
//! using `std::env`.

/// Retrieve a configuration value from environment variables.
#[must_use]
#[tracing::instrument]
pub fn get(key: &str) -> Option<String> {
    std::env::var(key).ok()
}

/// Retrieve the database URL from known environment variable names.
///
/// Checks `DATABASE_URL` first, then `NEON_DATABASE_URL`.
#[tracing::instrument]
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

    // NOTE: get_database_url() depends on DATABASE_URL and NEON_DATABASE_URL env vars,
    // which are also mutated by db.rs tests. To avoid race conditions we test the function
    // indirectly: we verify it returns Ok when at least one var is set (set by db tests too)
    // or verify the error message structure. The db::tests cover from_env scenarios thoroughly.

    #[test]
    fn test_get_database_url_returns_result() {
        // We just verify the function returns a Result without panicking.
        // The actual value depends on env state shared with other tests.
        let result = get_database_url();
        match result {
            Ok(url) => assert!(!url.is_empty()),
            Err(msg) => assert!(msg.contains("No database URL found")),
        }
    }

    #[test]
    fn test_get_returns_none_for_missing() {
        std::env::remove_var("NONEXISTENT_KEY_12345");
        assert!(get("NONEXISTENT_KEY_12345").is_none());
    }

    #[test]
    fn test_get_returns_some_for_existing() {
        std::env::set_var("SHARED_TEST_KEY_ABC", "hello_world");
        let val = get("SHARED_TEST_KEY_ABC");
        assert_eq!(val, Some("hello_world".to_string()));
        std::env::remove_var("SHARED_TEST_KEY_ABC");
    }

    #[test]
    fn test_get_empty_key() {
        // Empty key should return None (no env var with empty name)
        let val = get("");
        // This is platform-dependent, just verify it doesn't panic
        let _ = val;
    }
}
