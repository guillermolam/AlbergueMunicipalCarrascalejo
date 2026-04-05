use chrono::Utc;
use info_on_arrival_service::domain::{
    CardType, DifficultyLevel, EmergencyContact, EmergencyType, InfoCard, InfoLink, LinkType,
    RouteMapData, ScrapedContent, Waypoint,
};

#[test]
fn test_info_card_new_sets_defaults() {
    let card = InfoCard::new(
        CardType::MeridaAttractions,
        "Title".to_string(),
        "Content".to_string(),
    );
    assert_eq!(card.card_type, CardType::MeridaAttractions);
    assert_eq!(card.title, "Title");
    assert!(card.is_active);
    assert_eq!(card.language, "es");
    assert_eq!(card.cache_duration_hours, 24);
    assert!(card.links.is_empty());
}

#[test]
fn test_info_card_builder_methods() {
    let link = InfoLink {
        title: "L".to_string(),
        url: "u".to_string(),
        description: None,
        link_type: LinkType::Website,
        phone: None,
        address: None,
        rating: None,
        price_range: None,
    };
    let card = InfoCard::new(CardType::RouteMap, "T".to_string(), "C".to_string())
        .with_links(vec![link])
        .with_priority(5)
        .with_source_url("https://x.com".to_string())
        .with_markdown("# MD".to_string());

    assert_eq!(card.priority, 5);
    assert_eq!(card.links.len(), 1);
    assert_eq!(card.source_url.unwrap(), "https://x.com");
    assert_eq!(card.markdown_content.unwrap(), "# MD");
}

#[test]
fn test_info_card_cache_fresh() {
    let card = InfoCard::new(CardType::WeatherInfo, "T".to_string(), "C".to_string());
    assert!(!card.is_cache_expired());
}

#[test]
fn test_info_card_cache_expired() {
    let mut card = InfoCard::new(CardType::WeatherInfo, "T".to_string(), "C".to_string());
    card.last_updated = Utc::now() - chrono::Duration::hours(25);
    assert!(card.is_cache_expired());
}

#[test]
fn test_info_card_update_content() {
    let mut card = InfoCard::new(CardType::LocalEvents, "T".to_string(), "Old".to_string());
    card.update_content("New".to_string());
    assert_eq!(card.content, "New");
}

#[test]
fn test_info_card_add_link() {
    let mut card = InfoCard::new(CardType::CaminoTips, "T".to_string(), "C".to_string());
    let link = InfoLink {
        title: "Added".to_string(),
        url: "https://added.com".to_string(),
        description: None,
        link_type: LinkType::Email,
        phone: None,
        address: None,
        rating: None,
        price_range: None,
    };
    card.add_link(link);
    assert_eq!(card.links.len(), 1);
    assert_eq!(card.links[0].title, "Added");
}

#[test]
fn test_info_card_serialization_roundtrip() {
    let card = InfoCard::new(
        CardType::TaxiServices,
        "Taxis".to_string(),
        "Content".to_string(),
    )
    .with_priority(6);

    let json = serde_json::to_string(&card).unwrap();
    let back: InfoCard = serde_json::from_str(&json).unwrap();
    assert_eq!(back.card_type, CardType::TaxiServices);
    assert_eq!(back.priority, 6);
    assert_eq!(back.title, "Taxis");
}

#[test]
fn test_route_map_data_default() {
    let d = RouteMapData::default();
    assert_eq!(d.next_stage, "Almendralejo");
    assert!((d.distance_km - 21.5).abs() < f64::EPSILON);
    assert_eq!(d.difficulty_level, DifficultyLevel::Moderate);
    assert_eq!(d.waypoints.len(), 2);
}

#[test]
fn test_emergency_contact_construction() {
    let c = EmergencyContact {
        name: "Police".to_string(),
        phone: "112".to_string(),
        description: "Emergency".to_string(),
        available_hours: "24h".to_string(),
        contact_type: EmergencyType::Police,
    };
    assert_eq!(c.contact_type, EmergencyType::Police);
}

#[test]
fn test_scraped_content_serialization() {
    let sc = ScrapedContent {
        source_url: "https://example.com".to_string(),
        title: "Test".to_string(),
        content: "Body".to_string(),
        links: vec!["https://a.com".to_string()],
        images: vec![],
        last_scraped: Utc::now(),
        scraping_successful: true,
        error_message: None,
    };
    let json = serde_json::to_string(&sc).unwrap();
    let back: ScrapedContent = serde_json::from_str(&json).unwrap();
    assert!(back.scraping_successful);
    assert_eq!(back.links.len(), 1);
}

#[test]
fn test_all_card_types_roundtrip() {
    let types = vec![
        CardType::MeridaAttractions,
        CardType::CarrascalejoInfo,
        CardType::EmergencyContacts,
        CardType::RouteMap,
        CardType::WeatherInfo,
        CardType::LocalEvents,
        CardType::CaminoTips,
        CardType::TransportInfo,
        CardType::RestaurantsEat,
        CardType::TaxiServices,
        CardType::CarRentals,
    ];
    for ct in types {
        let json = serde_json::to_string(&ct).unwrap();
        let back: CardType = serde_json::from_str(&json).unwrap();
        assert_eq!(back, ct);
    }
}

#[test]
fn test_all_link_types_roundtrip() {
    let types = vec![
        LinkType::Website,
        LinkType::Phone,
        LinkType::Email,
        LinkType::Map,
        LinkType::SocialMedia,
        LinkType::Emergency,
        LinkType::Restaurant,
        LinkType::Taxi,
        LinkType::CarRental,
        LinkType::Accommodation,
        LinkType::Tourism,
    ];
    for lt in types {
        let json = serde_json::to_string(&lt).unwrap();
        let back: LinkType = serde_json::from_str(&json).unwrap();
        assert_eq!(back, lt);
    }
}

#[test]
fn test_waypoint_with_services() {
    let wp = Waypoint {
        name: "Test".to_string(),
        latitude: 38.9,
        longitude: -6.2,
        description: Some("A place".to_string()),
        services: vec!["food".to_string(), "water".to_string()],
    };
    assert_eq!(wp.services.len(), 2);
}

#[test]
fn test_difficulty_levels_not_equal() {
    assert_ne!(DifficultyLevel::Easy, DifficultyLevel::VeryDifficult);
}
