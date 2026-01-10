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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

    pub fn with_links(mut self, links: Vec<InfoLink>) -> Self {
        self.links = links;
        self
    }

    pub fn with_markdown(mut self, markdown: String) -> Self {
        self.markdown_content = Some(markdown);
        self
    }

    pub fn with_priority(mut self, priority: i32) -> Self {
        self.priority = priority;
        self
    }

    pub fn with_source_url(mut self, url: String) -> Self {
        self.source_url = Some(url);
        self
    }

    pub fn is_cache_expired(&self) -> bool {
        let cache_duration = chrono::Duration::hours(self.cache_duration_hours as i64);
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
