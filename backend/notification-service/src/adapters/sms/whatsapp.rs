use crate::domain::Notification;
use crate::ports::SmsPort;
use anyhow::Result;
use async_trait::async_trait;
use reqwest::Client;
use shared::{AlbergueError, AlbergueResult};
use std::env;

pub struct WhatsAppAdapter {
    client: Client,
    app_id: String,
    business_number: String,
    business_account_id: String,
}

impl WhatsAppAdapter {
    pub fn new() -> Self {
        let app_id = env::var("WHATSAPP_APP_ID").unwrap_or_default();
        let business_number = env::var("WHATSAPP_BUSINESS_NUMBER").unwrap_or_default();
        let business_account_id = env::var("WHATSAPP_BUSINESS_ACCOUNT_ID").unwrap_or_default();

        Self {
            client: Client::new(),
            app_id,
            business_number,
            business_account_id,
        }
    }

    async fn send_message(&self, to: &str, body: &str) -> AlbergueResult<String> {
        // Implement WhatsApp API call here
        // This is a placeholder example, adjust according to WhatsApp API documentation
        let url = format!(
            "https://graph.facebook.com/v15.0/{}/messages",
            self.business_account_id
        );

        let payload = serde_json::json!({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body}
        });

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.app_id)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                AlbergueError::ExternalServiceError(format!("WhatsApp request failed: {}", e))
            })?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await.map_err(|e| {
                AlbergueError::ExternalServiceError(format!(
                    "Failed to parse WhatsApp response: {}",
                    e
                ))
            })?;
            Ok(result["messages"][0]["id"]
                .as_str()
                .unwrap_or("unknown")
                .to_string())
        } else {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(AlbergueError::ExternalServiceError(format!(
                "WhatsApp error: {}",
                error_text
            )))
        }
    }
}

#[async_trait]
impl SmsPort for WhatsAppAdapter {
    async fn send_sms(&self, notification: &Notification) -> AlbergueResult<String> {
        // For SMS, we can fallback to sending a WhatsApp message or return an error
        Err(AlbergueError::ExternalServiceError(
            "Direct SMS not supported by WhatsAppAdapter".to_string(),
        ))
    }

    async fn send_whatsapp(&self, notification: &Notification) -> AlbergueResult<String> {
        let to = if notification.recipient.starts_with("whatsapp:") {
            notification.recipient.clone()
        } else {
            format!("whatsapp:{}", notification.recipient)
        };
        self.send_message(&to, &notification.message).await
    }
}
