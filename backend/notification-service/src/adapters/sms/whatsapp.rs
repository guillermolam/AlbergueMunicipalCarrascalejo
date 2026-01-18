use crate::domain::Notification;
use crate::ports::SmsPort;
use anyhow::Result;
use async_trait::async_trait;
use spin_sdk::http::{Request, Response, Method};
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
        
        let body_bytes = serde_json::to_vec(&payload).map_err(|e|
             AlbergueError::ExternalServiceError(format!("Failed to serialize payload: {}", e))
        )?;

        let auth_header = format!("Bearer {}", self.app_id);

        let req = Request::builder()
            .method(Method::Post)
            .uri(url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/json")
            .body(body_bytes)
            .build();

        let response: Response = spin_sdk::http::send(req).await.map_err(|e| {
             AlbergueError::ExternalServiceError(format!("WhatsApp request failed: {}", e))
        })?;

        if response.status() == 200 || response.status() == 201 {
            let body_bytes = response.body();
            let result: serde_json::Value = serde_json::from_slice(body_bytes).map_err(|e| 
                AlbergueError::ExternalServiceError(format!("Failed to parse WhatsApp response: {}", e))
            )?;
            Ok(result["messages"][0]["id"]
                .as_str()
                .unwrap_or("unknown")
                .to_string())
        } else {
             let body_str = String::from_utf8_lossy(response.body());
             Err(AlbergueError::ExternalServiceError(format!("WhatsApp error: {}", body_str)))
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

    async fn verify_twilio_connection(&self) -> AlbergueResult<bool> {
        Ok(true)
    }
}
