use crate::domain::notification::Notification;
use anyhow::Result;

pub struct NodemailerAdapter;

impl NodemailerAdapter {
    pub fn new() -> Self {
        Self
    }

    #[tracing::instrument(skip(self, notification))]
    pub async fn send_email(&self, notification: &Notification) -> Result<(String, String)> {
        Ok((notification.id.to_string(), "sent".to_string()))
    }
}
