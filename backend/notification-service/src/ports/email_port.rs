use crate::domain::notification::Notification;
use anyhow::Result;

pub struct EmailResult {
    pub message_id: String,
    pub status: String,
}

pub trait EmailPort: Send + Sync {
    fn send_email(
        &self,
        notification: &Notification,
    ) -> impl std::future::Future<Output = Result<EmailResult>> + Send;
}
