#[cfg(test)]
mod tests {
    use info_on_arrival_service::domain::*;

    #[test]
    fn test_info_card_creation() {
        let card = InfoCard::new(
            CardType::MeridaAttractions,
            "Test Card".to_string(),
            "Test content".to_string(),
        );

        assert_eq!(card.card_type, CardType::MeridaAttractions);
        assert_eq!(card.title, "Test Card");
        assert_eq!(card.content, "Test content");
        assert_eq!(card.priority, 0);
        assert!(card.is_active);
        assert_eq!(card.language, "es");
    }

    #[test]
    fn test_info_card_with_links() {
        let link = InfoLink {
            title: "Test Link".to_string(),
            url: "https://test.com".to_string(),
            description: Some("Test description".to_string()),
            link_type: LinkType::Website,
        };

        let card = InfoCard::new(
            CardType::EmergencyContacts,
            "Emergency".to_string(),
            "Emergency info".to_string(),
        )
        .with_links(vec![link.clone()]);

        assert_eq!(card.links.len(), 1);
        assert_eq!(card.links[0].title, "Test Link");
        assert_eq!(card.links[0].link_type, LinkType::Website);
    }

    #[test]
    fn test_card_cache_expiry() {
        let mut card = InfoCard::new(
            CardType::WeatherInfo,
            "Weather".to_string(),
            "Sunny".to_string(),
        );

        // Set cache duration to 0 hours to test expiry
        card.cache_duration_hours = 0;

        // Should be expired immediately
        assert!(card.is_cache_expired());
    }

    #[test]
    fn test_route_map_default() {
        let route = RouteMapData::default();

        assert_eq!(route.current_location, "Albergue del Carrascalejo");
        assert_eq!(route.next_stage, "Almendralejo");
        assert_eq!(route.distance_km, 21.5);
        assert_eq!(route.waypoints.len(), 2);
        assert!(matches!(route.difficulty_level, DifficultyLevel::Moderate));
    }
}
