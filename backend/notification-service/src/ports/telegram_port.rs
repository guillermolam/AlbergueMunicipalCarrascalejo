use crate::domain::Notification;
use async_trait::async_trait;
use shared::AlbergueResult;

#[async_trait]
pub trait TelegramPort: Send + Sync {
    async fn send_telegram(&self, notification: &Notification) -> AlbergueResult<String>;
    async fn verify_bot_connection(&self) -> AlbergueResult<bool>;
}
