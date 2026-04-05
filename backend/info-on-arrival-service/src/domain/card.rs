use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfoCard {
    pub id: Uuid,
    pub card_type: CardType,
    pub title: String,
    pub content: String,
    pub markdown_content: Option<String>,
    pub links: Vec<InfoLink>,
    pub priority: i32,
    pub is_active: bool,
    pub language: String,
    pub last_updated: DateTime<Utc>,
    pub source_url: Option<String>,
    pub cache_duration_hours: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CardType {
    MeridaAttractions,
    CarrascalejoInfo,
    EmergencyContacts,
    RouteMap,
    WeatherInfo,
    LocalEvents,
    CaminoTips,
    TransportInfo,
    RestaurantsEat,
    TaxiServices,
    CarRentals,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct InfoLink {
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub link_type: LinkType,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub rating: Option<f32>,
    pub price_range: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LinkType {
    Website,
    Phone,
    Email,
    Map,
    SocialMedia,
    Emergency,
    Restaurant,
    Taxi,
    CarRental,
    Accommodation,
    Tourism,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrapedContent {
    pub source_url: String,
    pub title: String,
    pub content: String,
    pub links: Vec<String>,
    pub images: Vec<String>,
    pub last_scraped: DateTime<Utc>,
    pub scraping_successful: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyContact {
    pub name: String,
    pub phone: String,
    pub description: String,
    pub available_hours: String,
    pub contact_type: EmergencyType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EmergencyType {
    Police,
    Medical,
    Fire,
    LocalAuthority,
    TouristInfo,
    Pharmacy,
    Hospital,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RouteMapData {
    pub current_location: String,
    pub next_stage: String,
    pub distance_km: f64,
    pub estimated_time_hours: f64,
    pub difficulty_level: DifficultyLevel,
    pub route_description: String,
    pub waypoints: Vec<Waypoint>,
    pub map_embed_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DifficultyLevel {
    Easy,
    Moderate,
    Difficult,
    VeryDifficult,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Waypoint {
    pub name: String,
    pub latitude: f64,
    pub longitude: f64,
    pub description: Option<String>,
    pub services: Vec<String>, // "food", "water", "accommodation", etc.
}

impl InfoCard {
    #[must_use]
    pub fn new(card_type: CardType, title: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4(),
            card_type,
            title,
            content,
            markdown_content: None,
            links: Vec::new(),
            priority: 0,
            is_active: true,
            language: "es".to_string(),
            last_updated: Utc::now(),
            source_url: None,
            cache_duration_hours: 24,
        }
    }

    #[must_use]
    pub fn with_links(mut self, links: Vec<InfoLink>) -> Self {
        self.links = links;
        self
    }

    #[must_use]
    pub fn with_markdown(mut self, markdown: String) -> Self {
        self.markdown_content = Some(markdown);
        self
    }

    #[must_use]
    pub fn with_priority(mut self, priority: i32) -> Self {
        self.priority = priority;
        self
    }

    #[must_use]
    pub fn with_source_url(mut self, url: String) -> Self {
        self.source_url = Some(url);
        self
    }

    #[must_use]
    pub fn is_cache_expired(&self) -> bool {
        let cache_duration = chrono::Duration::hours(i64::from(self.cache_duration_hours));
        Utc::now() - self.last_updated > cache_duration
    }

    pub fn update_content(&mut self, content: String) {
        self.content = content;
        self.last_updated = Utc::now();
    }

    pub fn add_link(&mut self, link: InfoLink) {
        self.links.push(link);
        self.last_updated = Utc::now();
    }
}

impl Default for RouteMapData {
    fn default() -> Self {
        Self {
            current_location: "Albergue del Carrascalejo".to_string(),
            next_stage: "Almendralejo".to_string(),
            distance_km: 21.5,
            estimated_time_hours: 5.5,
            difficulty_level: DifficultyLevel::Moderate,
            route_description: "Etapa típica de la Vía de la Plata desde Carrascalejo hasta Almendralejo".to_string(),
            waypoints: vec![
                Waypoint {
                    name: "Carrascalejo".to_string(),
                    latitude: 38.9167,
                    longitude: -6.1833,
                    description: Some("Punto de salida - Albergue del Carrascalejo".to_string()),
                    services: vec!["accommodation".to_string(), "food".to_string(), "water".to_string()],
                },
                Waypoint {
                    name: "Almendralejo".to_string(),
                    latitude: 38.6833,
                    longitude: -6.4167,
                    description: Some("Destino - Ciudad del vino".to_string()),
                    services: vec!["accommodation".to_string(), "food".to_string(), "water".to_string(), "pharmacy".to_string()],
                },
            ],
            map_embed_url: "https://www.openstreetmap.org/export/embed.html?bbox=-6.5,-6.1,38.6,39.0&layer=mapnik".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_info_card_new_defaults() {
        let card = InfoCard::new(
            CardType::MeridaAttractions,
            "Test Title".to_string(),
            "Test content".to_string(),
        );
        assert_eq!(card.card_type, CardType::MeridaAttractions);
        assert_eq!(card.title, "Test Title");
        assert_eq!(card.content, "Test content");
        assert!(card.links.is_empty());
        assert_eq!(card.priority, 0);
        assert!(card.is_active);
        assert_eq!(card.language, "es");
        assert!(card.source_url.is_none());
        assert!(card.markdown_content.is_none());
        assert_eq!(card.cache_duration_hours, 24);
    }

    #[test]
    fn test_info_card_with_links() {
        let link = InfoLink {
            title: "Link".to_string(),
            url: "https://example.com".to_string(),
            description: Some("A link".to_string()),
            link_type: LinkType::Website,
            phone: None,
            address: None,
            rating: None,
            price_range: None,
        };
        let card = InfoCard::new(
            CardType::EmergencyContacts,
            "Title".to_string(),
            "Content".to_string(),
        )
        .with_links(vec![link.clone()]);

        assert_eq!(card.links.len(), 1);
        assert_eq!(card.links[0].title, "Link");
    }

    #[test]
    fn test_info_card_with_priority() {
        let card = InfoCard::new(
            CardType::RouteMap,
            "Title".to_string(),
            "Content".to_string(),
        )
        .with_priority(10);
        assert_eq!(card.priority, 10);
    }

    #[test]
    fn test_info_card_with_source_url() {
        let card = InfoCard::new(
            CardType::RestaurantsEat,
            "Title".to_string(),
            "Content".to_string(),
        )
        .with_source_url("https://example.com".to_string());
        assert_eq!(card.source_url, Some("https://example.com".to_string()));
    }

    #[test]
    fn test_info_card_with_markdown() {
        let card = InfoCard::new(
            CardType::CaminoTips,
            "Title".to_string(),
            "Content".to_string(),
        )
        .with_markdown("# Hello".to_string());
        assert_eq!(card.markdown_content, Some("# Hello".to_string()));
    }

    #[test]
    fn test_info_card_update_content() {
        let mut card = InfoCard::new(
            CardType::WeatherInfo,
            "Title".to_string(),
            "Old content".to_string(),
        );
        let before = card.last_updated;
        card.update_content("New content".to_string());
        assert_eq!(card.content, "New content");
        assert!(card.last_updated >= before);
    }

    #[test]
    fn test_info_card_add_link() {
        let mut card = InfoCard::new(
            CardType::TransportInfo,
            "Title".to_string(),
            "Content".to_string(),
        );
        assert!(card.links.is_empty());

        let link = InfoLink {
            title: "New Link".to_string(),
            url: "https://new.com".to_string(),
            description: None,
            link_type: LinkType::Phone,
            phone: Some("+34000000000".to_string()),
            address: None,
            rating: None,
            price_range: None,
        };
        card.add_link(link);
        assert_eq!(card.links.len(), 1);
        assert_eq!(card.links[0].title, "New Link");
    }

    #[test]
    fn test_info_card_cache_not_expired_when_fresh() {
        let card = InfoCard::new(
            CardType::LocalEvents,
            "Title".to_string(),
            "Content".to_string(),
        );
        // A freshly created card should not have an expired cache
        assert!(!card.is_cache_expired());
    }

    #[test]
    fn test_info_card_cache_expired_when_old() {
        let mut card = InfoCard::new(
            CardType::LocalEvents,
            "Title".to_string(),
            "Content".to_string(),
        );
        // Set the last_updated to 25 hours ago (cache_duration_hours is 24)
        card.last_updated = Utc::now() - chrono::Duration::hours(25);
        assert!(card.is_cache_expired());
    }

    #[test]
    fn test_info_card_serialization_roundtrip() {
        let card = InfoCard::new(
            CardType::TaxiServices,
            "Taxi".to_string(),
            "Content".to_string(),
        )
        .with_priority(5)
        .with_source_url("https://taxi.com".to_string());

        let json = serde_json::to_string(&card).unwrap();
        let deserialized: InfoCard = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.card_type, CardType::TaxiServices);
        assert_eq!(deserialized.title, "Taxi");
        assert_eq!(deserialized.priority, 5);
        assert_eq!(
            deserialized.source_url,
            Some("https://taxi.com".to_string())
        );
    }

    #[test]
    fn test_info_link_serialization_roundtrip() {
        let link = InfoLink {
            title: "Restaurant".to_string(),
            url: "https://rest.com".to_string(),
            description: Some("A nice place".to_string()),
            link_type: LinkType::Restaurant,
            phone: Some("+34123456789".to_string()),
            address: Some("Main St 1".to_string()),
            rating: Some(4.5),
            price_range: Some("20-30".to_string()),
        };
        let json = serde_json::to_string(&link).unwrap();
        let deserialized: InfoLink = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, link);
    }

    #[test]
    fn test_card_type_all_variants_serialize() {
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
    fn test_route_map_data_default() {
        let data = RouteMapData::default();
        assert_eq!(data.current_location, "Albergue del Carrascalejo");
        assert_eq!(data.next_stage, "Almendralejo");
        assert!((data.distance_km - 21.5).abs() < f64::EPSILON);
        assert_eq!(data.difficulty_level, DifficultyLevel::Moderate);
        assert_eq!(data.waypoints.len(), 2);
        assert_eq!(data.waypoints[0].name, "Carrascalejo");
        assert_eq!(data.waypoints[1].name, "Almendralejo");
    }

    #[test]
    fn test_emergency_contact_construction() {
        let contact = EmergencyContact {
            name: "Emergencias".to_string(),
            phone: "112".to_string(),
            description: "European emergency number".to_string(),
            available_hours: "24h".to_string(),
            contact_type: EmergencyType::Police,
        };
        assert_eq!(contact.phone, "112");
        assert_eq!(contact.contact_type, EmergencyType::Police);
    }

    #[test]
    fn test_waypoint_with_services() {
        let wp = Waypoint {
            name: "Test Point".to_string(),
            latitude: 38.9,
            longitude: -6.2,
            description: Some("A stop".to_string()),
            services: vec!["food".to_string(), "water".to_string()],
        };
        assert_eq!(wp.services.len(), 2);
        assert!(wp.services.contains(&"food".to_string()));
    }

    #[test]
    fn test_difficulty_level_variants() {
        assert_ne!(DifficultyLevel::Easy, DifficultyLevel::Moderate);
        assert_ne!(DifficultyLevel::Difficult, DifficultyLevel::VeryDifficult);

        let json = serde_json::to_string(&DifficultyLevel::VeryDifficult).unwrap();
        let back: DifficultyLevel = serde_json::from_str(&json).unwrap();
        assert_eq!(back, DifficultyLevel::VeryDifficult);
    }

    #[test]
    fn test_link_type_all_variants_serialize() {
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
    fn test_info_card_builder_chain() {
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
        let card = InfoCard::new(CardType::CarRentals, "Cars".to_string(), "Rent".to_string())
            .with_links(vec![link])
            .with_priority(7)
            .with_source_url("https://cars.com".to_string())
            .with_markdown("**bold**".to_string());

        assert_eq!(card.priority, 7);
        assert_eq!(card.links.len(), 1);
        assert_eq!(card.source_url, Some("https://cars.com".to_string()));
        assert_eq!(card.markdown_content, Some("**bold**".to_string()));
    }

    #[test]
    fn test_scraped_content_construction() {
        let sc = ScrapedContent {
            source_url: "https://example.com".to_string(),
            title: "Test".to_string(),
            content: "Some content".to_string(),
            links: vec!["https://a.com".to_string()],
            images: vec![],
            last_scraped: Utc::now(),
            scraping_successful: true,
            error_message: None,
        };
        assert!(sc.scraping_successful);
        assert!(sc.error_message.is_none());
        assert_eq!(sc.links.len(), 1);
    }
}
