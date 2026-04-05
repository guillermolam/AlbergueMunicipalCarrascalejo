use location_service::{ApiResponse, CacheConfig, CacheEntry, CountryData, LocationService};

#[cfg(test)]
mod country_data_tests {
    use super::*;

    #[test]
    fn test_country_data_serialization() {
        let country = CountryData {
            code: "ES".to_string(),
            name: "Spain".to_string(),
            flag: Some("\u{1f1ea}\u{1f1f8}".to_string()),
            phone_prefix: Some("+34".to_string()),
            continent: Some("Europe".to_string()),
            capital: Some("Madrid".to_string()),
            currency: Some("EUR".to_string()),
            languages: vec!["Spanish".to_string()],
            calling_code: Some("+34".to_string()),
        };

        let serialized = serde_json::to_string(&country).unwrap();
        let deserialized: CountryData = serde_json::from_str(&serialized).unwrap();

        assert_eq!(country.code, deserialized.code);
        assert_eq!(country.name, deserialized.name);
        assert_eq!(country.flag, deserialized.flag);
        assert_eq!(country.phone_prefix, deserialized.phone_prefix);
        assert_eq!(country.continent, deserialized.continent);
        assert_eq!(country.capital, deserialized.capital);
        assert_eq!(country.currency, deserialized.currency);
        assert_eq!(country.languages, deserialized.languages);
        assert_eq!(country.calling_code, deserialized.calling_code);
    }

    #[test]
    fn test_country_data_with_none_values() {
        let country = CountryData {
            code: "XX".to_string(),
            name: "Unknown".to_string(),
            flag: None,
            phone_prefix: None,
            continent: None,
            capital: None,
            currency: None,
            languages: vec![],
            calling_code: None,
        };

        let serialized = serde_json::to_string(&country).unwrap();
        let deserialized: CountryData = serde_json::from_str(&serialized).unwrap();

        assert_eq!(country.code, deserialized.code);
        assert_eq!(country.name, deserialized.name);
        assert!(deserialized.flag.is_none());
        assert!(deserialized.phone_prefix.is_none());
        assert!(deserialized.continent.is_none());
        assert!(deserialized.capital.is_none());
        assert!(deserialized.currency.is_none());
        assert!(deserialized.languages.is_empty());
        assert!(deserialized.calling_code.is_none());
    }

    #[test]
    fn test_api_response_success() {
        let country = CountryData {
            code: "FR".to_string(),
            name: "France".to_string(),
            flag: None,
            phone_prefix: None,
            continent: None,
            capital: None,
            currency: None,
            languages: vec![],
            calling_code: None,
        };

        let response = ApiResponse::success(country);
        assert!(response.success);
        assert_eq!(response.data.unwrap().code, "FR");
        assert!(response.message.is_none());
    }

    #[test]
    fn test_api_response_error() {
        let response = ApiResponse::<()>::error("Country not found".to_string());
        assert!(!response.success);
        assert!(response.data.is_none());
        assert_eq!(response.message.unwrap(), "Country not found");
    }
}

#[cfg(test)]
mod cache_entry_tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn test_cache_entry_serialization() {
        let country_data = CountryData {
            code: "FR".to_string(),
            name: "France".to_string(),
            flag: Some("\u{1f1eb}\u{1f1f7}".to_string()),
            phone_prefix: Some("+33".to_string()),
            continent: Some("Europe".to_string()),
            capital: Some("Paris".to_string()),
            currency: Some("EUR".to_string()),
            languages: vec!["French".to_string()],
            calling_code: Some("+33".to_string()),
        };

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let cache_entry = CacheEntry {
            data: country_data,
            timestamp,
        };

        let serialized = serde_json::to_string(&cache_entry).unwrap();
        let deserialized: CacheEntry = serde_json::from_str(&serialized).unwrap();

        assert_eq!(cache_entry.data.code, deserialized.data.code);
        assert_eq!(cache_entry.timestamp, deserialized.timestamp);
    }
}

#[cfg(test)]
mod location_service_tests {
    use super::*;

    #[tokio::test]
    async fn test_location_service_new() {
        let service = LocationService::new();
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_location_service_with_memory_cache() {
        let config = CacheConfig {
            enabled: true,
            ttl: std::time::Duration::from_secs(7200),
        };
        let service = LocationService::with_memory_cache(Some(config));
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_get_country_data_known_country() {
        let mut service = LocationService::new();

        let result = service.get_country_data("ES").await.unwrap();
        assert!(result.is_some());
        let country = result.unwrap();
        assert_eq!(country.code, "ES");
        assert_eq!(country.name, "Spain");
        assert_eq!(country.flag.unwrap(), "\u{1f1ea}\u{1f1f8}");
        assert_eq!(country.phone_prefix.unwrap(), "+34");
        assert_eq!(country.continent.unwrap(), "Europe");
        assert_eq!(country.capital.unwrap(), "Madrid");
        assert_eq!(country.currency.unwrap(), "EUR");
        assert_eq!(country.languages, vec!["Spanish"]);
    }

    #[tokio::test]
    async fn test_get_country_data_unknown_country() {
        let mut service = LocationService::new();

        let result = service.get_country_data("XX").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_get_country_data_case_insensitive() {
        let mut service = LocationService::new();

        // Test lowercase
        let result = service.get_country_data("es").await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().code, "ES");
    }

    #[tokio::test]
    async fn test_get_country_data_empty_code() {
        let mut service = LocationService::new();

        let result = service.get_country_data("").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_cache_functionality() {
        let mut service = LocationService::new();

        // First call should populate cache
        let result1 = service.get_country_data("ES").await.unwrap();
        assert!(result1.is_some());
        assert_eq!(service.cache_size(), 1);

        // Second call should use cache
        let result2 = service.get_country_data("ES").await.unwrap();
        assert!(result2.is_some());
        assert_eq!(service.cache_size(), 1);

        // Verify cache entry
        assert!(service.is_cached("ES"));
    }

    #[tokio::test]
    async fn test_clear_cache() {
        let mut service = LocationService::new();

        service.get_country_data("ES").await.unwrap();
        assert_eq!(service.cache_size(), 1);

        service.clear_cache().await.unwrap();
        assert_eq!(service.cache_size(), 0);
        assert!(!service.is_cached("ES"));
    }

    #[tokio::test]
    async fn test_warm_cache() {
        let mut service = LocationService::new();

        assert_eq!(service.cache_size(), 0);

        // Only "ES" is in the hardcoded source — others will be None
        let countries = ["ES"];
        let result = service.warm_cache(&countries).await;

        assert!(result.is_ok());
        assert_eq!(service.cache_size(), 1);
        assert!(service.is_cached("ES"));
    }

    #[tokio::test]
    async fn test_warm_cache_empty_list() {
        let mut service = LocationService::new();

        let countries: &[&str] = &[];
        let result = service.warm_cache(countries).await;

        assert!(result.is_ok());
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_is_cached_function() {
        let mut service = LocationService::new();

        assert!(!service.is_cached("ES"));

        service.get_country_data("ES").await.unwrap();
        assert!(service.is_cached("ES"));
        assert!(!service.is_cached("XX"));
    }

    #[tokio::test]
    async fn test_cache_size_tracking() {
        let mut service = LocationService::new();

        assert_eq!(service.cache_size(), 0);

        service.get_country_data("ES").await.unwrap();
        assert_eq!(service.cache_size(), 1);

        service.clear_cache().await.unwrap();
        assert_eq!(service.cache_size(), 0);
    }

    #[tokio::test]
    async fn test_default_implementation() {
        let service = LocationService::default();
        assert_eq!(service.cache_size(), 0);
    }
}
