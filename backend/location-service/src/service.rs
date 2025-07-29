use anyhow::Result;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::models::{CacheEntry, CountryData};

pub struct CountryService {
    cache: HashMap<String, CacheEntry>,
    cache_ttl: u64,
}

impl CountryService {
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
            cache_ttl: 3600, // 1 hour default
        }
    }

    pub fn with_cache_ttl(cache_ttl: u64) -> Self {
        Self {
            cache: HashMap::new(),
            cache_ttl,
        }
    }

    pub async fn get_country_data(&mut self, code: &str) -> Result<Option<CountryData>> {
        let code = code.to_uppercase();

        // Check cache first
        if let Some(entry) = self.cache.get(&code) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            if now - entry.timestamp < self.cache_ttl {
                return Ok(Some(entry.data.clone()));
            }
        }

        // Mock data for demonstration
        let country_data = match code.as_str() {
            "ES" => Some(CountryData {
                code: "ES".to_string(),
                name: "Spain".to_string(),
                flag: Some("🇪🇸".to_string()),
                phone_prefix: Some("+34".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Madrid".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Spanish".to_string()],
            }),
            "FR" => Some(CountryData {
                code: "FR".to_string(),
                name: "France".to_string(),
                flag: Some("🇫🇷".to_string()),
                phone_prefix: Some("+33".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Paris".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["French".to_string()],
            }),
            "PT" => Some(CountryData {
                code: "PT".to_string(),
                name: "Portugal".to_string(),
                flag: Some("🇵🇹".to_string()),
                phone_prefix: Some("+351".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Lisbon".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Portuguese".to_string()],
            }),
            "IT" => Some(CountryData {
                code: "IT".to_string(),
                name: "Italy".to_string(),
                flag: Some("🇮🇹".to_string()),
                phone_prefix: Some("+39".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Rome".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["Italian".to_string()],
            }),
            "DE" => Some(CountryData {
                code: "DE".to_string(),
                name: "Germany".to_string(),
                flag: Some("🇩🇪".to_string()),
                phone_prefix: Some("+49".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("Berlin".to_string()),
                currency: Some("EUR".to_string()),
                languages: vec!["German".to_string()],
            }),
            "GB" => Some(CountryData {
                code: "GB".to_string(),
                name: "United Kingdom".to_string(),
                flag: Some("🇬🇧".to_string()),
                phone_prefix: Some("+44".to_string()),
                continent: Some("Europe".to_string()),
                capital: Some("London".to_string()),
                currency: Some("GBP".to_string()),
                languages: vec!["English".to_string()],
            }),
            _ => None,
        };

        if let Some(data) = &country_data {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            self.cache.insert(
                code,
                CacheEntry {
                    data: data.clone(),
                    timestamp: now,
                },
            );
        }

        Ok(country_data)
    }

    pub async fn warm_cache(&mut self, codes: &[&str]) -> Result<()> {
        for code in codes {
            self.get_country_data(code).await?;
        }
        Ok(())
    }

    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }

    pub fn is_cached(&self, code: &str) -> bool {
        let code = code.to_uppercase();
        if let Some(entry) = self.cache.get(&code) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            now - entry.timestamp < self.cache_ttl
        } else {
            false
        }
    }
}

#[cfg(test)]
impl Default for CountryService {
    fn default() -> Self {
        Self::new()
    }
}