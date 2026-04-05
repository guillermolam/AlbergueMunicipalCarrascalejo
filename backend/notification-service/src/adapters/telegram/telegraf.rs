use crate::domain::Notification;
use crate::ports::TelegramPort;
use async_trait::async_trait;
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

#[async_trait(?Send)]
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

        let body_str = serde_json::to_string(&payload).map_err(|e|
             AlbergueError::ExternalServiceError(format!("Failed to serialize payload: {}", e))
        )?;

        let mut headers = worker::Headers::new();
        headers.set("Content-Type", "application/json").map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to set header: {}", e))
        )?;

        let mut init = worker::RequestInit::new();
        init.with_method(worker::Method::Post);
        init.with_headers(headers);
        init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body_str)));

        let request = worker::Request::new_with_init(&url, &init).map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to create request: {}", e))
        )?;

        let mut response = worker::Fetch::Request(request).send().await.map_err(|e|
            AlbergueError::ExternalServiceError(format!("Telegram request failed: {}", e))
        )?;

        let status = response.status_code();
        if status == 200 || status == 201 {
            let text = response.text().await.map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to read Telegram response: {}", e))
            )?;
            let result: serde_json::Value = serde_json::from_str(&text).map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to parse Telegram response: {}", e))
            )?;

            Ok(result["result"]["message_id"].to_string())
        } else {
            let body_str = response.text().await.unwrap_or_default();
            Err(AlbergueError::ExternalServiceError(format!("Telegram error: {}", body_str)))
        }
    }

    async fn verify_bot_connection(&self) -> AlbergueResult<bool> {
        let url = format!("https://api.telegram.org/bot{}/getMe", self.bot_token);

        let mut init = worker::RequestInit::new();
        init.with_method(worker::Method::Get);

        let request = match worker::Request::new_with_init(&url, &init) {
            Ok(r) => r,
            Err(_) => return Ok(false),
        };

        match worker::Fetch::Request(request).send().await {
            Ok(response) => Ok(response.status_code() == 200),
            Err(_) => Ok(false),
        }
    }
}
