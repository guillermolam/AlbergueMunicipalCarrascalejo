use crate::domain::Notification;
use async_trait::async_trait;
use shared::AlbergueResult;

#[async_trait]
pub trait EmailPort: Send + Sync {
    async fn send_email(&self, notification: &Notification) -> AlbergueResult<String>;
    async fn verify_smtp_connection(&self) -> AlbergueResult<bool>;
}
