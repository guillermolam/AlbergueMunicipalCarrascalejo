use crate::domain::{
    CardType, DifficultyLevel, InfoCard, InfoLink, LinkType, RouteMapData, Waypoint,
};
use crate::ports::{ScraperPort, StoragePort};
use serde_json;
use shared::{AlbergueError, AlbergueResult};
use std::future::Future;
use std::pin::Pin;

pub struct CardsServiceImpl {
    storage: Box<dyn StoragePort>,
    scraper: Box<dyn ScraperPort>,
}

impl CardsServiceImpl {
    pub fn new(storage: Box<dyn StoragePort>, scraper: Box<dyn ScraperPort>) -> Self {
        Self { storage, scraper }
    }

    #[tracing::instrument(skip(self, create_card))]
    async fn get_or_create_card<F, Fut>(
        &self,
        card_type: CardType,
        create_card: F,
    ) -> AlbergueResult<String>
    where
        F: FnOnce() -> Fut,
        Fut: std::future::Future<Output = AlbergueResult<InfoCard>>,
    {
        if let Ok(cached_card) = self.storage.get_card_by_type(card_type).await {
            if !cached_card.is_cache_expired() {
                tracing::debug!("returning cached card");
                return Ok(serde_json::to_string(&cached_card)?);
            }
        }
        let card = create_card().await?;
        self.storage.save_card(card.clone()).await?;
        Ok(serde_json::to_string(&card)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_merida_attractions(&self) -> AlbergueResult<String> {
        self.get_or_create_card(CardType::MeridaAttractions, || async {
            let scraped_content = self.scraper.scrape_merida_attractions().await?;
            Ok(InfoCard::new(
                CardType::MeridaAttractions,
                "Qué ver en Mérida".to_string(),
                format!(
                    "Descubre los tesoros romanos de Mérida:\n\n{}\n\nMérida es un verdadero museo al aire libre con más de 2000 años de historia.",
                    scraped_content.content
                ),
            )
            .with_links(vec![
                InfoLink {
                    title: "Teatro Romano".to_string(),
                    url: "https://www.consorciomerida.org/teatro-romano".to_string(),
                    description: Some("Espectacular teatro del siglo I a.C.".to_string()),
                    link_type: LinkType::Website,
                    phone: None,
                    address: None,
                    rating: None,
                    price_range: None,
                },
                InfoLink {
                    title: "Anfiteatro Romano".to_string(),
                    url: "https://www.consorciomerida.org/anfiteatro".to_string(),
                    description: Some("Donde luchaban los gladiadores".to_string()),
                    link_type: LinkType::Website,
                    phone: None,
                    address: None,
                    rating: None,
                    price_range: None,
                },
                InfoLink {
                    title: "Museo Nacional de Arte Romano".to_string(),
                    url: "https://www.culturaydeporte.gob.es/mnar".to_string(),
                    description: Some("Impresionante colección de arte romano".to_string()),
                    link_type: LinkType::Website,
                    phone: None,
                    address: None,
                    rating: None,
                    price_range: None,
                },
                InfoLink {
                    title: "Puente Romano".to_string(),
                    url: "https://goo.gl/maps/example".to_string(),
                    description: Some("Uno de los puentes romanos mejor conservados".to_string()),
                    link_type: LinkType::Map,
                    phone: None,
                    address: None,
                    rating: None,
                    price_range: None,
                },
            ])
            .with_priority(1)
            .with_source_url(scraped_content.source_url))
        }).await
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_carrascalejo_info(&self) -> AlbergueResult<String> {
        if let Ok(cached_card) = self
            .storage
            .get_card_by_type(CardType::CarrascalejoInfo)
            .await
        {
            if !cached_card.is_cache_expired() {
                return Ok(serde_json::to_string(&cached_card)?);
            }
        }

        let carrascalejo_card = InfoCard::new(
            CardType::CarrascalejoInfo,
            "El Carrascalejo - Curiosidades".to_string(),
            r#"¡Bienvenido a Carrascalejo! 🏘️

Este pequeño pueblo de apenas 300 habitantes guarda secretos fascinantes:

**Historia del Camino:**
• Antigua calzada romana de la Vía de la Plata
• Los peregrinos pasan por aquí desde hace más de 1000 años
• El nombre viene de "carrascal" - bosque de encinas

**Curiosidades locales:**
• El pueblo tiene más camas de albergue que habitantes 😄
• La iglesia parroquial data del siglo XVI
• Famoso por sus productos ibéricos y aceite de oliva
• Los vecinos conocen a cada peregrino por su nombre

**Tradiciones:**
• Fiesta patronal: San Bartolomé (24 de agosto)
• Matanza tradicional en invierno
• Recogida de aceitunas en familia

**El Albergue:**
• Único albergue del pueblo, referencia en la Vía de la Plata
• Atención personalizada y ambiente familiar
• Desayuno casero con productos locales"#
                .to_string(),
        )
        .with_links(vec![
            InfoLink {
                title: "Ayuntamiento de Carrascalejo".to_string(),
                url: "tel:+34924123456".to_string(),
                description: Some("Información municipal".to_string()),
                link_type: LinkType::Phone,
                phone: Some("+34924123456".to_string()),
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "Centro de Salud".to_string(),
                url: "tel:+34924654321".to_string(),
                description: Some("Atención médica básica".to_string()),
                link_type: LinkType::Phone,
                phone: Some("+34924654321".to_string()),
                address: None,
                rating: None,
                price_range: None,
            },
        ])
        .with_priority(2);

        self.storage.save_card(carrascalejo_card.clone()).await?;
        Ok(serde_json::to_string(&carrascalejo_card)?)
    }

    #[tracing::instrument(skip(self))]
    #[allow(clippy::unused_async)]
    pub async fn get_emergency_contacts(&self) -> AlbergueResult<String> {
        let emergency_card = InfoCard::new(
            CardType::EmergencyContacts,
            "Emergencias y Contactos Útiles".to_string(),
            "Números importantes para tu seguridad:".to_string(),
        )
        .with_links(vec![
            InfoLink {
                title: "🚨 Emergencias".to_string(),
                url: "tel:112".to_string(),
                description: Some("Número europeo de emergencias (24h)".to_string()),
                link_type: LinkType::Emergency,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "👮 Guardia Civil".to_string(),
                url: "tel:062".to_string(),
                description: Some("Fuerzas de seguridad (24h)".to_string()),
                link_type: LinkType::Emergency,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "🏥 Centro de Salud Mérida".to_string(),
                url: "tel:+34924330000".to_string(),
                description: Some("Hospital más cercano (20 km)".to_string()),
                link_type: LinkType::Phone,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "💊 Farmacia Almendralejo".to_string(),
                url: "tel:+34924660123".to_string(),
                description: Some("Farmacia 24h más cercana".to_string()),
                link_type: LinkType::Phone,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "🚕 Taxi Local".to_string(),
                url: "tel:+34924987654".to_string(),
                description: Some("Servicio de taxi local".to_string()),
                link_type: LinkType::Phone,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "ℹ️ Oficina de Turismo Mérida".to_string(),
                url: "tel:+34924315353".to_string(),
                description: Some("Información turística (9-14h, 16-19h)".to_string()),
                link_type: LinkType::Phone,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
        ])
        .with_priority(10); // High priority for emergency info

        Ok(serde_json::to_string(&emergency_card)?)
    }

    #[tracing::instrument(skip(self))]
    #[allow(clippy::unused_async)]
    pub async fn get_route_map(&self, next_stage: &str) -> AlbergueResult<String> {
        let route_data = match next_stage {
            "merida" | "Mérida" => RouteMapData {
                current_location: "Albergue del Carrascalejo".to_string(),
                next_stage: "Mérida".to_string(),
                distance_km: 38.0,
                estimated_time_hours: 8.5,
                difficulty_level: DifficultyLevel::Moderate,
                route_description: "Etapa larga pero hermosa hacia la capital romana".to_string(),
                waypoints: vec![
                    Waypoint {
                        name: "Carrascalejo".to_string(),
                        latitude: 38.9167,
                        longitude: -6.1833,
                        description: Some("Salida del albergue".to_string()),
                        services: vec!["accommodation".to_string(), "food".to_string()],
                    },
                    Waypoint {
                        name: "Aljucén".to_string(),
                        latitude: 38.8500,
                        longitude: -6.2833,
                        description: Some("Pueblo intermedio con bar".to_string()),
                        services: vec!["food".to_string(), "water".to_string()],
                    },
                    Waypoint {
                        name: "Mérida".to_string(),
                        latitude: 38.9165,
                        longitude: -6.3500,
                        description: Some("Ciudad romana patrimonio UNESCO".to_string()),
                        services: vec!["accommodation".to_string(), "food".to_string(), "medical".to_string()],
                    },
                ],
                map_embed_url: "https://www.openstreetmap.org/export/embed.html?bbox=-6.4,-6.1,38.8,39.0&layer=mapnik".to_string(),
            },
            _ => RouteMapData::default(),
        };

        let map_card = InfoCard::new(
            CardType::RouteMap,
            format!("Ruta hacia {}", route_data.next_stage),
            format!(
                "📍 **Próxima etapa:** {}\n📏 **Distancia:** {:.1} km\n⏱️ **Tiempo estimado:** {:.1} horas\n🏔️ **Dificultad:** {:?}\n\n{}",
                route_data.next_stage,
                route_data.distance_km,
                route_data.estimated_time_hours,
                route_data.difficulty_level,
                route_data.route_description
            ),
        )
        .with_links(vec![
            InfoLink {
                title: "🗺️ Ver mapa interactivo".to_string(),
                url: route_data.map_embed_url.clone(),
                description: Some("Mapa detallado de la ruta".to_string()),
                link_type: LinkType::Map,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
            InfoLink {
                title: "🌤️ Previsión meteorológica".to_string(),
                url: format!("https://www.aemet.es/es/eltiempo/prediccion/municipios/{}", next_stage.to_lowercase()),
                description: Some("Consulta el tiempo antes de salir".to_string()),
                link_type: LinkType::Website,
                phone: None,
                address: None,
                rating: None,
                price_range: None,
            },
        ])
        .with_priority(3);

        Ok(serde_json::to_string(&map_card)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_restaurants_eat(&self) -> AlbergueResult<String> {
        // Try to get cached content first
        if let Ok(cached_card) = self
            .storage
            .get_card_by_type(CardType::RestaurantsEat)
            .await
        {
            if !cached_card.is_cache_expired() {
                return Ok(serde_json::to_string(&cached_card)?);
            }
        }

        // Create restaurants card with official data from Turismo Mérida
        let restaurants_card = InfoCard::new(
            CardType::RestaurantsEat,
            "Dónde y qué comer cerca".to_string(),
            "Restaurantes recomendados en Mérida con cocina tradicional extremeña:".to_string(),
        )
        .with_links(vec![
            InfoLink {
                title: "Restaurante Rex Numitor".to_string(),
                url: "https://turismomerida.org/donde-comer/".to_string(),
                description: Some("Cocina extremeña junto al Teatro Romano. Especialidad en carnes ibéricas y migas extremeñas.".to_string()),
                link_type: LinkType::Restaurant,
                phone: Some("+34 924 314 261".to_string()),
                address: Some("Calle de José Ramón Mélida, 06800 Mérida".to_string()),
                rating: Some(4.3),
                price_range: Some("25-35€ por persona".to_string()),
            },
            InfoLink {
                title: "Tabula Calda".to_string(),
                url: "https://www.tabulacalda.com/".to_string(),
                description: Some("Restaurante romano temático con ambiente histórico. Ideal para cenar tras visitar los monumentos.".to_string()),
                link_type: LinkType::Restaurant,
                phone: Some("+34 924 304 512".to_string()),
                address: Some("Calle Romero Leal, 11, 06800 Mérida".to_string()),
                rating: Some(4.5),
                price_range: Some("30-40€ por persona".to_string()),
            },
            InfoLink {
                title: "Mesón El Asador".to_string(),
                url: "https://turismomerida.org/donde-comer/".to_string(),
                description: Some("Asador tradicional con cordero y cochinillo. Ambiente familiar y precios moderados.".to_string()),
                link_type: LinkType::Restaurant,
                phone: Some("+34 924 315 028".to_string()),
                address: Some("Avenida de Extremadura, 6, 06800 Mérida".to_string()),
                rating: Some(4.2),
                price_range: Some("20-30€ por persona".to_string()),
            },
            InfoLink {
                title: "Casa Benito".to_string(),
                url: "https://turismomerida.org/donde-comer/".to_string(),
                description: Some("Bar de tapas tradicional frecuentado por locales. Perfecto para almorzar económico.".to_string()),
                link_type: LinkType::Restaurant,
                phone: Some("+34 924 300 076".to_string()),
                address: Some("Calle San Francisco, 3, 06800 Mérida".to_string()),
                rating: Some(4.4),
                price_range: Some("10-15€ por persona".to_string()),
            },
        ])
        .with_priority(4)
        .with_source_url("https://turismomerida.org/donde-comer/".to_string());

        self.storage.save_card(restaurants_card.clone()).await?;
        Ok(serde_json::to_string(&restaurants_card)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_taxi_services(&self) -> AlbergueResult<String> {
        if let Ok(cached_card) = self.storage.get_card_by_type(CardType::TaxiServices).await {
            if !cached_card.is_cache_expired() {
                return Ok(serde_json::to_string(&cached_card)?);
            }
        }

        let taxi_card = InfoCard::new(
            CardType::TaxiServices,
            "Servicios de Taxi".to_string(),
            "Servicios de taxi disponibles 24 horas en Mérida y alrededores:".to_string(),
        )
        .with_links(vec![
            InfoLink {
                title: "Radio Taxi Mérida".to_string(),
                url: "https://www.radiotaximerida.es/".to_string(),
                description: Some("Servicio principal de taxi 24 horas. Tarifas oficiales y conductores profesionales.".to_string()),
                link_type: LinkType::Taxi,
                phone: Some("+34 924 371 111".to_string()),
                address: Some("Mérida centro".to_string()),
                rating: Some(4.1),
                price_range: Some("Desde Carrascalejo: ~35-45€".to_string()),
            },
            InfoLink {
                title: "Taxi Mérida 24h".to_string(),
                url: "https://meridavisitas.com/taxi-merida-24-horas/".to_string(),
                description: Some("Servicio alternativo con reservas por WhatsApp. Especializado en traslados aeropuerto.".to_string()),
                link_type: LinkType::Taxi,
                phone: Some("+34 924 372 070".to_string()),
                address: Some("Toda la zona metropolitana".to_string()),
                rating: Some(4.0),
                price_range: Some("Aeropuerto Badajoz: ~60€".to_string()),
            },
            InfoLink {
                title: "Taxi Almendralejo".to_string(),
                url: "tel:+34924661234".to_string(),
                description: Some("Para traslados directos desde Almendralejo (más cercano a Carrascalejo).".to_string()),
                link_type: LinkType::Taxi,
                phone: Some("+34 924 661 234".to_string()),
                address: Some("Almendralejo".to_string()),
                rating: Some(3.9),
                price_range: Some("Desde Carrascalejo: ~15-20€".to_string()),
            },
        ])
        .with_priority(6)
        .with_source_url("https://www.radiotaximerida.es/".to_string());

        self.storage.save_card(taxi_card.clone()).await?;
        Ok(serde_json::to_string(&taxi_card)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_car_rentals(&self) -> AlbergueResult<String> {
        if let Ok(cached_card) = self.storage.get_card_by_type(CardType::CarRentals).await {
            if !cached_card.is_cache_expired() {
                return Ok(serde_json::to_string(&cached_card)?);
            }
        }

        let car_rental_card = InfoCard::new(
            CardType::CarRentals,
            "Alquiler de Coches".to_string(),
            "Empresas de alquiler de vehículos en Mérida para continuar tu viaje:".to_string(),
        )
        .with_links(vec![
            InfoLink {
                title: "Hertz Mérida".to_string(),
                url: "https://www.hertz.es/p/alquiler-de-coches/espana/merida".to_string(),
                description: Some("Oficina en el centro de Mérida. Amplia flota desde económicos hasta SUV.".to_string()),
                link_type: LinkType::CarRental,
                phone: Some("+34 924 317 203".to_string()),
                address: Some("Avenida de Portugal, 15, 06800 Mérida".to_string()),
                rating: Some(4.2),
                price_range: Some("Desde 25€/día económico".to_string()),
            },
            InfoLink {
                title: "Europcar Mérida".to_string(),
                url: "https://www.europcar.es/".to_string(),
                description: Some("Situada cerca de la estación de tren. Buenos precios para alquileres de varios días.".to_string()),
                link_type: LinkType::CarRental,
                phone: Some("+34 924 305 842".to_string()),
                address: Some("Calle Cardero, 40, 06800 Mérida".to_string()),
                rating: Some(4.0),
                price_range: Some("Desde 22€/día económico".to_string()),
            },
            InfoLink {
                title: "Avis Badajoz (Aeropuerto)".to_string(),
                url: "https://www.avis.es/".to_string(),
                description: Some("Para recoger en el aeropuerto de Badajoz si llegas en vuelo. Traslado necesario.".to_string()),
                link_type: LinkType::CarRental,
                phone: Some("+34 924 420 734".to_string()),
                address: Some("Aeropuerto de Badajoz, 06195 Badajoz".to_string()),
                rating: Some(4.1),
                price_range: Some("Desde 30€/día + traslado".to_string()),
            },
            InfoLink {
                title: "Autocares Leda (Alternativa)".to_string(),
                url: "https://www.leda.es/".to_string(),
                description: Some("Autobuses regulares Mérida-Madrid-Barcelona si prefieres transporte público.".to_string()),
                link_type: LinkType::Website,
                phone: Some("+34 924 371 616".to_string()),
                address: Some("Estación de Autobuses, Mérida".to_string()),
                rating: Some(3.8),
                price_range: Some("Madrid: 20-35€ según horario".to_string()),
            },
        ])
        .with_priority(5)
        .with_source_url("https://www.hertz.es/".to_string());

        self.storage.save_card(car_rental_card.clone()).await?;
        Ok(serde_json::to_string(&car_rental_card)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn get_all_info_cards(&self) -> AlbergueResult<String> {
        let mut all_cards = Vec::new();

        // Get all card types - including new ones
        let card_methods: Vec<Pin<Box<dyn Future<Output = AlbergueResult<String>> + '_>>> = vec![
            Box::pin(self.get_merida_attractions()),
            Box::pin(self.get_carrascalejo_info()),
            Box::pin(self.get_emergency_contacts()),
            Box::pin(self.get_route_map("almendralejo")),
            Box::pin(self.get_restaurants_eat()),
            Box::pin(self.get_taxi_services()),
            Box::pin(self.get_car_rentals()),
        ];

        for card_future in card_methods {
            if let Ok(card_json) = card_future.await {
                if let Ok(parsed) = serde_json::from_str::<InfoCard>(&card_json) {
                    all_cards.push(parsed);
                }
            }
        }

        // Sort by priority (highest first)
        all_cards.sort_by(|a, b| b.priority.cmp(&a.priority));

        Ok(serde_json::to_string(&all_cards)?)
    }

    #[tracing::instrument(skip(self))]
    pub async fn update_card_content(
        &self,
        card_id: &str,
        content: &str,
    ) -> AlbergueResult<String> {
        let card_uuid = uuid::Uuid::parse_str(card_id).map_err(|_| AlbergueError::Validation {
            message: "Invalid card ID format".to_string(),
        })?;

        let mut card = self.storage.get_card_by_id(card_uuid).await?;
        card.update_content(content.to_string());

        self.storage.save_card(card.clone()).await?;

        Ok(serde_json::to_string(&card)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ScrapedContent;
    use async_trait::async_trait;
    use chrono::Utc;
    use std::sync::Mutex;

    // --- Mock Storage ---
    struct MockStorage {
        cards: Mutex<Vec<InfoCard>>,
    }

    impl MockStorage {
        fn new() -> Self {
            Self {
                cards: Mutex::new(Vec::new()),
            }
        }
    }

    #[async_trait]
    impl StoragePort for MockStorage {
        async fn save_card(&self, card: InfoCard) -> AlbergueResult<InfoCard> {
            let mut cards = self.cards.lock().unwrap();
            // Replace if same type exists
            cards.retain(|c| c.card_type != card.card_type);
            cards.push(card.clone());
            Ok(card)
        }

        async fn get_card_by_id(&self, id: uuid::Uuid) -> AlbergueResult<InfoCard> {
            let cards = self.cards.lock().unwrap();
            cards
                .iter()
                .find(|c| c.id == id)
                .cloned()
                .ok_or(AlbergueError::NotFound(format!("Card {id} not found")))
        }

        async fn get_card_by_type(&self, card_type: CardType) -> AlbergueResult<InfoCard> {
            let cards = self.cards.lock().unwrap();
            cards
                .iter()
                .find(|c| c.card_type == card_type)
                .cloned()
                .ok_or(AlbergueError::NotFound("Not found".to_string()))
        }

        async fn get_all_cards(&self) -> AlbergueResult<Vec<InfoCard>> {
            Ok(self.cards.lock().unwrap().clone())
        }

        async fn delete_card(&self, id: uuid::Uuid) -> AlbergueResult<()> {
            let mut cards = self.cards.lock().unwrap();
            cards.retain(|c| c.id != id);
            Ok(())
        }

        async fn get_cards_by_language(&self, language: &str) -> AlbergueResult<Vec<InfoCard>> {
            let cards = self.cards.lock().unwrap();
            Ok(cards
                .iter()
                .filter(|c| c.language == language)
                .cloned()
                .collect())
        }
    }

    // --- Mock Scraper ---
    struct MockScraper;

    #[async_trait]
    impl ScraperPort for MockScraper {
        async fn scrape_merida_attractions(&self) -> AlbergueResult<ScrapedContent> {
            Ok(ScrapedContent {
                source_url: "https://mock.test/merida".to_string(),
                title: "Mock Attractions".to_string(),
                content: "Teatro Romano\nAnfiteatro".to_string(),
                links: vec![],
                images: vec![],
                last_scraped: Utc::now(),
                scraping_successful: true,
                error_message: None,
            })
        }

        async fn scrape_carrascalejo_info(&self) -> AlbergueResult<ScrapedContent> {
            Ok(ScrapedContent {
                source_url: "https://mock.test/carrascalejo".to_string(),
                title: "Mock Carrascalejo".to_string(),
                content: "Info about Carrascalejo".to_string(),
                links: vec![],
                images: vec![],
                last_scraped: Utc::now(),
                scraping_successful: true,
                error_message: None,
            })
        }

        async fn scrape_weather_info(&self, location: &str) -> AlbergueResult<ScrapedContent> {
            Ok(ScrapedContent {
                source_url: format!("https://mock.test/weather/{location}"),
                title: format!("Weather for {location}"),
                content: "Sunny 25C".to_string(),
                links: vec![],
                images: vec![],
                last_scraped: Utc::now(),
                scraping_successful: true,
                error_message: None,
            })
        }

        async fn scrape_local_events(&self, location: &str) -> AlbergueResult<ScrapedContent> {
            Ok(ScrapedContent {
                source_url: format!("https://mock.test/events/{location}"),
                title: "Events".to_string(),
                content: "No events".to_string(),
                links: vec![],
                images: vec![],
                last_scraped: Utc::now(),
                scraping_successful: true,
                error_message: None,
            })
        }

        async fn scrape_restaurants(&self) -> AlbergueResult<Vec<ScrapedContent>> {
            Ok(vec![])
        }

        async fn scrape_taxi_services(&self) -> AlbergueResult<Vec<ScrapedContent>> {
            Ok(vec![])
        }

        async fn scrape_car_rentals(&self) -> AlbergueResult<Vec<ScrapedContent>> {
            Ok(vec![])
        }
    }

    fn make_service() -> CardsServiceImpl {
        CardsServiceImpl::new(Box::new(MockStorage::new()), Box::new(MockScraper))
    }

    // --- Tests ---

    #[tokio::test]
    async fn test_get_merida_attractions_returns_non_empty() {
        let svc = make_service();
        let result = svc.get_merida_attractions().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::MeridaAttractions);
        assert!(!card.content.is_empty());
        assert!(card.content.contains("Mérida"));
        assert!(!card.links.is_empty());
    }

    #[tokio::test]
    async fn test_get_merida_attractions_has_four_links() {
        let svc = make_service();
        let result = svc.get_merida_attractions().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.links.len(), 4);
        assert_eq!(card.links[0].title, "Teatro Romano");
    }

    #[tokio::test]
    async fn test_get_carrascalejo_info_returns_expected_info() {
        let svc = make_service();
        let result = svc.get_carrascalejo_info().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::CarrascalejoInfo);
        assert!(card.content.contains("Carrascalejo"));
        assert!(card.content.contains("300 habitantes"));
        assert_eq!(card.links.len(), 2);
    }

    #[tokio::test]
    async fn test_get_emergency_contacts_returns_contacts_with_phone_numbers() {
        let svc = make_service();
        let result = svc.get_emergency_contacts().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::EmergencyContacts);
        assert!(card.links.len() >= 5);
        // All emergency contact links should start with "tel:"
        for link in &card.links {
            assert!(
                link.url.starts_with("tel:"),
                "Emergency link url should be a phone: {}",
                link.url
            );
        }
        assert_eq!(card.priority, 10);
    }

    #[tokio::test]
    async fn test_get_route_map_merida() {
        let svc = make_service();
        let result = svc.get_route_map("merida").await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::RouteMap);
        assert!(card.title.contains("Mérida"));
        assert!(card.content.contains("38.0 km"));
        assert_eq!(card.links.len(), 2);
    }

    #[tokio::test]
    async fn test_get_route_map_unknown_stage_defaults_to_almendralejo() {
        let svc = make_service();
        let result = svc.get_route_map("unknown_place").await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert!(card.title.contains("Almendralejo"));
        assert!(card.content.contains("21.5 km"));
    }

    #[tokio::test]
    async fn test_get_all_info_cards_returns_combined_cards() {
        let svc = make_service();
        let result = svc.get_all_info_cards().await.unwrap();
        let cards: Vec<InfoCard> = serde_json::from_str(&result).unwrap();
        assert!(
            cards.len() >= 5,
            "Expected at least 5 cards, got {}",
            cards.len()
        );
        // Should be sorted by priority descending
        for window in cards.windows(2) {
            assert!(
                window[0].priority >= window[1].priority,
                "Cards should be sorted by priority descending: {} >= {}",
                window[0].priority,
                window[1].priority
            );
        }
    }

    #[tokio::test]
    async fn test_get_restaurants_eat_returns_restaurant_data() {
        let svc = make_service();
        let result = svc.get_restaurants_eat().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::RestaurantsEat);
        assert!(!card.links.is_empty());
        // All links should be Restaurant type
        for link in &card.links {
            assert_eq!(link.link_type, LinkType::Restaurant);
            assert!(
                link.phone.is_some(),
                "Restaurant should have a phone number"
            );
            assert!(link.address.is_some(), "Restaurant should have an address");
            assert!(link.rating.is_some(), "Restaurant should have a rating");
        }
    }

    #[tokio::test]
    async fn test_get_taxi_services_returns_taxi_data() {
        let svc = make_service();
        let result = svc.get_taxi_services().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::TaxiServices);
        assert_eq!(card.links.len(), 3);
        for link in &card.links {
            assert_eq!(link.link_type, LinkType::Taxi);
            assert!(link.phone.is_some(), "Taxi link should have a phone number");
        }
    }

    #[tokio::test]
    async fn test_get_car_rentals_returns_car_rental_data() {
        let svc = make_service();
        let result = svc.get_car_rentals().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert_eq!(card.card_type, CardType::CarRentals);
        assert_eq!(card.links.len(), 4);
        // First three should be CarRental, last is Website (bus)
        assert_eq!(card.links[0].link_type, LinkType::CarRental);
        assert_eq!(card.links[3].link_type, LinkType::Website);
    }

    #[tokio::test]
    async fn test_emergency_contacts_includes_112() {
        let svc = make_service();
        let result = svc.get_emergency_contacts().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        let has_112 = card.links.iter().any(|l| l.url == "tel:112");
        assert!(has_112, "Emergency contacts should include 112");
    }

    #[tokio::test]
    async fn test_restaurants_have_price_ranges() {
        let svc = make_service();
        let result = svc.get_restaurants_eat().await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        for link in &card.links {
            assert!(
                link.price_range.is_some(),
                "Restaurant {} should have a price range",
                link.title
            );
        }
    }

    #[tokio::test]
    async fn test_route_map_merida_alternate_name() {
        let svc = make_service();
        let result = svc.get_route_map("Mérida").await.unwrap();
        let card: InfoCard = serde_json::from_str(&result).unwrap();
        assert!(card.title.contains("Mérida"));
        assert!(card.content.contains("38.0 km"));
    }

    #[tokio::test]
    async fn test_all_info_cards_contains_emergency_high_priority() {
        let svc = make_service();
        let result = svc.get_all_info_cards().await.unwrap();
        let cards: Vec<InfoCard> = serde_json::from_str(&result).unwrap();
        // Emergency contacts have priority 10, should appear first
        let first_card = &cards[0];
        assert_eq!(first_card.card_type, CardType::EmergencyContacts);
        assert_eq!(first_card.priority, 10);
    }
}
