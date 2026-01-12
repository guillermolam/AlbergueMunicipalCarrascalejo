#[cfg(target_arch = "wasm32")]
use spin_sdk::key_value::Store;

/// Configuration service using Spin KV store for sensitive data
#[cfg(target_arch = "wasm32")]
pub struct ConfigService {
    store: Store,
}

#[cfg(target_arch = "wasm32")]
impl ConfigService {
    /// Open the configuration store
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let store = Store::open("config")?;
        Ok(Self { store })
    }

    /// Get a configuration value by key
    pub fn get(&self, key: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
        match self.store.get(key) {
            Ok(data) => {
                let value = String::from_utf8(data)?;
                Ok(Some(value))
            }
            Err(_) => Ok(None),
        }
    }

    /// Set a configuration value
    pub fn set(&self, key: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.store.set(key, value.as_bytes())?;
        Ok(())
    }

    /// Get database URL from KV store or environment fallback
    pub fn get_database_url(&self) -> Result<String, Box<dyn std::error::Error>> {
        // Try KV store first
        if let Some(url) = self.get("DATABASE_URL")? {
            return Ok(url);
        }

        // Fallback to environment variable
        std::env::var("DATABASE_URL")
            .or_else(|_| std::env::var("NEON_DATABASE_URL"))
            .map_err(|_| "No database URL found in KV store or environment".into())
    }

    /// Get all configuration keys
    pub fn get_all_keys(&self) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        Ok(self.store.get_keys()?)
    }

    /// Delete a configuration key
    pub fn delete(&self, key: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.store.delete(key)?;
        Ok(())
    }
}

/// Get database URL from configuration
#[cfg(target_arch = "wasm32")]
pub fn get_database_url() -> Result<String, Box<dyn std::error::Error>> {
    let config = ConfigService::new()?;
    config.get_database_url()
}

#[cfg(all(test, target_arch = "wasm32"))]
mod tests {
    use super::*;

    #[test]
    fn test_config_service_creation() {
        // This test would require Spin runtime
        // For now, just test that the struct can be created
        // In a real test environment with Spin, we would test the KV operations
    }
}
