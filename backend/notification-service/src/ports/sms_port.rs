use crate::domain::Notification;
use async_trait::async_trait;
use shared::AlbergueResult;

#[async_trait]
pub trait SmsPort: Send + Sync {
    async fn send_sms(&self, notification: &Notification) -> AlbergueResult<String>;
    async fn send_whatsapp(&self, notification: &Notification) -> AlbergueResult<String>;
    async fn verify_twilio_connection(&self) -> AlbergueResult<bool>;
}
