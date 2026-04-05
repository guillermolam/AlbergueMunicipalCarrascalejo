use crate::domain::Notification;
use crate::ports::SmsPort;
use async_trait::async_trait;
use shared::{AlbergueError, AlbergueResult};
use std::env;

pub struct WhatsAppAdapter {
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
            app_id,
            business_number,
            business_account_id,
        }
    }

    async fn send_message(&self, to: &str, body: &str) -> AlbergueResult<String> {
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

        let body_str = serde_json::to_string(&payload).map_err(|e|
             AlbergueError::ExternalServiceError(format!("Failed to serialize payload: {}", e))
        )?;

        let auth_header = format!("Bearer {}", self.app_id);

        let mut headers = worker::Headers::new();
        headers.set("Authorization", &auth_header).map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to set header: {}", e))
        )?;
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
            AlbergueError::ExternalServiceError(format!("WhatsApp request failed: {}", e))
        )?;

        let status = response.status_code();
        if status == 200 || status == 201 {
            let text = response.text().await.map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to read WhatsApp response: {}", e))
            )?;
            let result: serde_json::Value = serde_json::from_str(&text).map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to parse WhatsApp response: {}", e))
            )?;
            Ok(result["messages"][0]["id"]
                .as_str()
                .unwrap_or("unknown")
                .to_string())
        } else {
            let body_str = response.text().await.unwrap_or_default();
            Err(AlbergueError::ExternalServiceError(format!("WhatsApp error: {}", body_str)))
        }
    }
}

#[async_trait(?Send)]
impl SmsPort for WhatsAppAdapter {
    async fn send_sms(&self, _notification: &Notification) -> AlbergueResult<String> {
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

    async fn verify_twilio_connection(&self) -> AlbergueResult<bool> {
        Ok(true)
    }
}
