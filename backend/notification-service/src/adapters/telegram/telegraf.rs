use crate::domain::Notification;
use crate::ports::TelegramPort;
use async_trait::async_trait;
use spin_sdk::http::{Request, Response, Method};
use serde_json::json;
use shared::{AlbergueError, AlbergueResult};

pub struct TelegrafAdapter {
    bot_token: String,
    chat_id: String,
}

impl TelegrafAdapter {
    pub fn new() -> Self {
        let bot_token = std::env::var("TELEGRAM_BOT_TOKEN").unwrap_or_default();
        let chat_id = std::env::var("TELEGRAM_CHAT_ID").unwrap_or_default();

        Self {
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
        
        let body_bytes = serde_json::to_vec(&payload).map_err(|e|
             AlbergueError::ExternalServiceError(format!("Failed to serialize payload: {}", e))
        )?;

        let req = Request::builder()
            .method(Method::Post)
            .uri(url)
            .header("Content-Type", "application/json")
            .body(body_bytes)
            .build();

        let response: Response = spin_sdk::http::send(req).await.map_err(|e| {
             AlbergueError::ExternalServiceError(format!("Telegram request failed: {}", e))
        })?;

        if response.status() == 200 || response.status() == 201 {
            let body_bytes = response.body();
            let result: serde_json::Value = serde_json::from_slice(body_bytes).map_err(|e| 
                AlbergueError::ExternalServiceError(format!("Failed to parse Telegram response: {}", e))
            )?;

            Ok(result["result"]["message_id"].to_string())
        } else {
             let body_str = String::from_utf8_lossy(response.body());
             Err(AlbergueError::ExternalServiceError(format!("Telegram error: {}", body_str)))
        }
    }

    async fn verify_bot_connection(&self) -> AlbergueResult<bool> {
        let url = format!("https://api.telegram.org/bot{}/getMe", self.bot_token);
        
        let req = Request::builder()
            .method(Method::Get)
            .uri(url)
            .body(vec![])
            .build();

        match spin_sdk::http::send(req).await {
            Ok(response) => Ok(response.status() == 200),
            Err(_) => Ok(false),
        }
    }
}
