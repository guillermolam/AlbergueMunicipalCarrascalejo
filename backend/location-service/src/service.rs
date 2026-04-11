use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::models::{CacheConfig, CacheEntry, CountryData, LocationServiceError};

pub struct LocationService {
    memory_cache: HashMap<String, CacheEntry>,
    cache_config: CacheConfig,
}

impl Default for LocationService {
    fn default() -> Self {
        Self::new()
    }
}

impl LocationService {
    #[must_use]
    pub fn new() -> Self {
        Self {
            memory_cache: HashMap::new(),
            cache_config: CacheConfig::default(),
        }
    }

    #[must_use]
    pub fn with_memory_cache(cache_config: Option<CacheConfig>) -> Self {
        let config = cache_config.unwrap_or_default();
        Self {
            memory_cache: HashMap::new(),
            cache_config: config,
        }
    }

    pub async fn get_country_data(
        &mut self,
        code: &str,
    ) -> Result<Option<CountryData>, LocationServiceError> {
        let code = code.to_uppercase();

        if let Some(entry) = self.memory_cache.get(&code) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|_| {
                    LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
                })?
                .as_secs();

            if now - entry.timestamp < self.cache_config.ttl.as_secs() {
                return Ok(Some(entry.data.clone()));
            }
        }

        let country_data = self.get_country_from_source(&code).await?;

        if let Some(ref data) = country_data {
            self.update_cache(&code, data).await?;
        }

        Ok(country_data)
    }

    async fn get_country_from_source(
        &self,
        code: &str,
    ) -> Result<Option<CountryData>, LocationServiceError> {
        match code {
            "ES" => Ok(Some(CountryData {
                code: "ES".to_string(),
                name: "Spain".to_string(),
                flag: Some("\u{1f1ea}\u{1f1f8}".to_string()),
                phone_prefix: Some("+34".to_string()),
                calling_code: Some("+34".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Madrid".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Spanish".to_string()],
            })),
            "FR" => Ok(Some(CountryData {
                code: "FR".to_string(),
                name: "France".to_string(),
                flag: Some("\u{1f1eb}\u{1f1f7}".to_string()),
                phone_prefix: Some("+33".to_string()),
                calling_code: Some("+33".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Paris".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["French".to_string()],
            })),
            "PT" => Ok(Some(CountryData {
                code: "PT".to_string(),
                name: "Portugal".to_string(),
                flag: Some("\u{1f1f5}\u{1f1f9}".to_string()),
                phone_prefix: Some("+351".to_string()),
                calling_code: Some("+351".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Lisbon".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Portuguese".to_string()],
            })),
            "DE" => Ok(Some(CountryData {
                code: "DE".to_string(),
                name: "Germany".to_string(),
                flag: Some("\u{1f1e9}\u{1f1ea}".to_string()),
                phone_prefix: Some("+49".to_string()),
                calling_code: Some("+49".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Berlin".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["German".to_string()],
            })),
            "IT" => Ok(Some(CountryData {
                code: "IT".to_string(),
                name: "Italy".to_string(),
                flag: Some("\u{1f1ee}\u{1f1f9}".to_string()),
                phone_prefix: Some("+39".to_string()),
                calling_code: Some("+39".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Rome".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Italian".to_string()],
            })),
            "GB" => Ok(Some(CountryData {
                code: "GB".to_string(),
                name: "United Kingdom".to_string(),
                flag: Some("\u{1f1ec}\u{1f1e7}".to_string()),
                phone_prefix: Some("+44".to_string()),
                calling_code: Some("+44".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("London".to_string()),
                currency: Some("GBP".to_string()),
                languages: vec!["English".to_string()],
            })),
            _ => Ok(None),
        }
    }

    async fn update_cache(
        &mut self,
        code: &str,
        data: &CountryData,
    ) -> Result<(), LocationServiceError> {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| {
                LocationServiceError::Cache("System time is before UNIX_EPOCH".to_string())
            })?
            .as_secs();

        let entry = CacheEntry {
            data: data.clone(),
            timestamp,
        };

        self.memory_cache.insert(code.to_string(), entry);
        Ok(())
    }

    pub async fn warm_cache(&mut self, codes: &[&str]) -> Result<(), LocationServiceError> {
        for code in codes {
            self.get_country_data(code).await?;
        }
        Ok(())
    }

    pub async fn clear_cache(&mut self) -> Result<(), LocationServiceError> {
        self.memory_cache.clear();
        log::info!("Memory cache cleared");
        Ok(())
    }

    pub async fn clear_country_cache(
        &mut self,
        country_code: &str,
    ) -> Result<(), LocationServiceError> {
        let code = country_code.to_uppercase();
        self.memory_cache.remove(&code);
        Ok(())
    }

    #[must_use]
    pub fn cache_size(&self) -> usize {
        self.memory_cache.len()
    }

    #[must_use]
    pub fn is_cached(&self, code: &str) -> bool {
        self.memory_cache
            .get(&code.to_uppercase())
            .is_some_and(|entry| {
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .ok()
                    .map_or(0, |d| d.as_secs());
                now.checked_sub(entry.timestamp)
                    .is_some_and(|age| age < self.cache_config.ttl.as_secs())
            })
    }
}
