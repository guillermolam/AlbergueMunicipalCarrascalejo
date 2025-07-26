use crate::domain::Notification;
use crate::ports::TelegramPort;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use shared::{AlbergueError, AlbergueResult};

pub struct TelegrafAdapter {
    client: Client,
    bot_token: String,
    chat_id: String,
}

impl TelegrafAdapter {
    pub fn new() -> Self {
        let bot_token = std::env::var("TELEGRAM_BOT_TOKEN").unwrap_or_default();
        let chat_id = std::env::var("TELEGRAM_CHAT_ID").unwrap_or_default();

        Self {
            client: Client::new(),
            bot_token,
            chat_id,
        }
    }
}

#[async_trait]
impl TelegramPort for TelegrafAdapter {
    async fn send_telegram(&self, notification: &Notification) -> AlbergueResult<String> {
        let url = format!("https://api.telegram.org/bot{}/sendMessage", self.bot_token);

        let chat_id = if notification.recipient.is_empty() {
            &self.chat_id
        } else {
            &notification.recipient
        };

        let payload = json!({
            "chat_id": chat_id,
            "text": notification.message,
            "parse_mode": "Markdown"
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| {
                AlbergueError::ExternalServiceError(format!("Telegram request failed: {}", e))
            })?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await.map_err(|e| {
                AlbergueError::ExternalServiceError(format!(
                    "Failed to parse Telegram response: {}",
                    e
                ))
            })?;

            Ok(result["result"]["message_id"].to_string())
        } else {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(AlbergueError::ExternalServiceError(format!(
                "Telegram error: {}",
                error_text
            )))
        }
    }

    async fn verify_bot_connection(&self) -> AlbergueResult<bool> {
        let url = format!("https://api.telegram.org/bot{}/getMe", self.bot_token);

        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}
