use crate::domain::*;
use crate::ports::StoragePort;
use async_trait::async_trait;
use shared::{AlbergueError, AlbergueResult};
#[cfg(not(target_arch = "wasm32"))]
use sqlx::{PgPool, Row};
use uuid::Uuid;

pub struct PostgresCardsRepository {
    #[cfg(not(target_arch = "wasm32"))]
    pool: Option<PgPool>,
    #[cfg(target_arch = "wasm32")]
    #[allow(dead_code)]
    pool: (),
}

impl PostgresCardsRepository {
    pub fn new() -> Self {
        // In WASM context, database operations would be handled differently
        // For now, we'll simulate the repository
        #[cfg(target_arch = "wasm32")]
        {
            Self { pool: () }
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            Self { pool: None }
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub async fn with_database(database_url: &str) -> AlbergueResult<Self> {
        let pool = PgPool::connect(database_url).await.map_err(|e| {
            AlbergueError::DatabaseError(format!("Failed to connect to database: {}", e))
        })?;

        Ok(Self { pool: Some(pool) })
    }
}

#[async_trait]
impl StoragePort for PostgresCardsRepository {
    async fn save_card(&self, card: InfoCard) -> AlbergueResult<InfoCard> {
        #[cfg(target_arch = "wasm32")]
        {
            // In WASM, we'd use browser storage or send to the gateway
            // For now, just return the card as if it was saved
            tracing::info!("WASM: Simulating card save for {}", card.title);
            Ok(card)
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                let card_type_str = serde_json::to_string(&card.card_type)?;
                let links_json = serde_json::to_string(&card.links)?;

                sqlx::query!(
                    r#"
                    INSERT INTO info_cards (
                        id, card_type, title, content, markdown_content, 
                        links, priority, is_active, language, last_updated,
                        source_url, cache_duration_hours
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT (id) DO UPDATE SET
                        content = EXCLUDED.content,
                        markdown_content = EXCLUDED.markdown_content,
                        links = EXCLUDED.links,
                        last_updated = EXCLUDED.last_updated
                    "#,
                    card.id,
                    card_type_str,
                    card.title,
                    card.content,
                    card.markdown_content,
                    links_json,
                    card.priority,
                    card.is_active,
                    card.language,
                    card.last_updated,
                    card.source_url,
                    card.cache_duration_hours
                )
                .execute(pool)
                .await
                .map_err(|e| AlbergueError::DatabaseError(format!("Failed to save card: {}", e)))?;

                Ok(card)
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }

    async fn get_card_by_id(&self, id: Uuid) -> AlbergueResult<InfoCard> {
        #[cfg(target_arch = "wasm32")]
        {
            // Simulate returning a card
            Err(AlbergueError::NotFound(format!(
                "Card {} not found in WASM storage",
                id
            )))
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                let row = sqlx::query!("SELECT * FROM info_cards WHERE id = $1", id)
                    .fetch_one(pool)
                    .await
                    .map_err(|_| AlbergueError::NotFound(format!("Card {} not found", id)))?;

                self.row_to_card(row)
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }

    async fn get_card_by_type(&self, card_type: CardType) -> AlbergueResult<InfoCard> {
        #[cfg(target_arch = "wasm32")]
        {
            // Return a default card based on type for WASM
            match card_type {
                CardType::MeridaAttractions => Ok(InfoCard::new(
                    card_type,
                    "Qué ver en Mérida".to_string(),
                    "Contenido por defecto para WASM".to_string(),
                )),
                _ => Err(AlbergueError::NotFound("Card type not found".to_string())),
            }
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                let card_type_str = serde_json::to_string(&card_type)?;

                let row = sqlx::query!(
                    "SELECT * FROM info_cards WHERE card_type = $1 ORDER BY last_updated DESC LIMIT 1",
                    card_type_str
                )
                .fetch_one(pool)
                .await
                .map_err(|_| AlbergueError::NotFound("Card type not found".to_string()))?;

                self.row_to_card(row)
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }

    async fn get_all_cards(&self) -> AlbergueResult<Vec<InfoCard>> {
        #[cfg(target_arch = "wasm32")]
        {
            // Return empty list for WASM
            Ok(Vec::new())
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                let rows = sqlx::query!(
                    "SELECT * FROM info_cards WHERE is_active = true ORDER BY priority DESC, last_updated DESC"
                )
                .fetch_all(pool)
                .await
                .map_err(|e| AlbergueError::DatabaseError(format!("Failed to fetch cards: {}", e)))?;

                let mut cards = Vec::new();
                for row in rows {
                    if let Ok(card) = self.row_to_card(row) {
                        cards.push(card);
                    }
                }
                Ok(cards)
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }

    async fn delete_card(&self, id: Uuid) -> AlbergueResult<()> {
        #[cfg(target_arch = "wasm32")]
        {
            tracing::info!("WASM: Simulating card deletion for {}", id);
            Ok(())
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                sqlx::query!("DELETE FROM info_cards WHERE id = $1", id)
                    .execute(pool)
                    .await
                    .map_err(|e| {
                        AlbergueError::DatabaseError(format!("Failed to delete card: {}", e))
                    })?;
                Ok(())
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }

    async fn get_cards_by_language(&self, language: &str) -> AlbergueResult<Vec<InfoCard>> {
        #[cfg(target_arch = "wasm32")]
        {
            let _ = language;
            Ok(Vec::new())
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            if let Some(pool) = &self.pool {
                let rows = sqlx::query!(
                    "SELECT * FROM info_cards WHERE language = $1 AND is_active = true ORDER BY priority DESC",
                    language
                )
                .fetch_all(pool)
                .await
                .map_err(|e| AlbergueError::DatabaseError(format!("Failed to fetch cards: {}", e)))?;

                let mut cards = Vec::new();
                for row in rows {
                    if let Ok(card) = self.row_to_card(row) {
                        cards.push(card);
                    }
                }
                Ok(cards)
            } else {
                Err(AlbergueError::DatabaseError(
                    "No database connection".to_string(),
                ))
            }
        }
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl PostgresCardsRepository {
    fn row_to_card(&self, row: sqlx::postgres::PgRow) -> AlbergueResult<InfoCard> {
        let card_type: CardType = serde_json::from_str(
            &row.try_get::<String, _>("card_type")
                .map_err(|e| AlbergueError::DatabaseError(format!("Invalid card_type: {}", e)))?,
        )?;

        let links: Vec<InfoLink> = serde_json::from_str(
            &row.try_get::<String, _>("links")
                .map_err(|e| AlbergueError::DatabaseError(format!("Invalid links: {}", e)))?,
        )?;

        Ok(InfoCard {
            id: row.try_get("id")?,
            card_type,
            title: row.try_get("title")?,
            content: row.try_get("content")?,
            markdown_content: row.try_get("markdown_content")?,
            links,
            priority: row.try_get("priority")?,
            is_active: row.try_get("is_active")?,
            language: row.try_get("language")?,
            last_updated: row.try_get("last_updated")?,
            source_url: row.try_get("source_url")?,
            cache_duration_hours: row.try_get("cache_duration_hours")?,
        })
    }
}
