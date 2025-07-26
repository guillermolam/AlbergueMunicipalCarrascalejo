use crate::domain::*;
use async_trait::async_trait;
use shared::AlbergueResult;
use uuid::Uuid;

#[async_trait]
pub trait StoragePort: Send + Sync {
    async fn save_card(&self, card: InfoCard) -> AlbergueResult<InfoCard>;
    async fn get_card_by_id(&self, id: Uuid) -> AlbergueResult<InfoCard>;
    async fn get_card_by_type(&self, card_type: CardType) -> AlbergueResult<InfoCard>;
    async fn get_all_cards(&self) -> AlbergueResult<Vec<InfoCard>>;
    async fn delete_card(&self, id: Uuid) -> AlbergueResult<()>;
    async fn get_cards_by_language(&self, language: &str) -> AlbergueResult<Vec<InfoCard>>;
}
