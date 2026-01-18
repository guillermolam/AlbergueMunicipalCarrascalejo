use crate::domain::Notification;
use crate::ports::SmsPort;
use async_trait::async_trait;
use spin_sdk::http::{Request, Response, Method};
use shared::{AlbergueError, AlbergueResult};
use std::collections::HashMap;
use base64::Engine;

pub struct TwilioAdapter {
    account_sid: String,
    auth_token: String,
    phone_number: String,
    whatsapp_number: String,
}

impl TwilioAdapter {
    pub fn new() -> Self {
        let account_sid = std::env::var("TWILIO_ACCOUNT_SID").unwrap_or_default();
        let auth_token = std::env::var("TWILIO_AUTH_TOKEN").unwrap_or_default();
        let phone_number = std::env::var("TWILIO_PHONE_NUMBER").unwrap_or_default();
        let whatsapp_number = std::env::var("TWILIO_WHATSAPP_NUMBER").unwrap_or_default();

        Self {
            account_sid,
            auth_token,
            phone_number,
            whatsapp_number,
        }
    }

    async fn send_message(&self, to: &str, from: &str, body: &str) -> AlbergueResult<String> {
        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
            self.account_sid
        );

        let mut params = HashMap::new();
        params.insert("To", to);
        params.insert("From", from);
        params.insert("Body", body);

        let body_content = serde_urlencoded::to_string(&params).map_err(|e| 
             AlbergueError::ExternalServiceError(format!("Failed to encode params: {}", e))
        )?;

        let auth = format!("{}:{}", self.account_sid, self.auth_token);
        let auth_header = format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(auth));

        let req = Request::builder()
            .method(Method::Post)
            .uri(url)
            .header("Authorization", auth_header)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body_content.into_bytes())
            .build();

        let response: Response = spin_sdk::http::send(req).await.map_err(|e| {
             AlbergueError::ExternalServiceError(format!("Twilio request failed: {}", e))
        })?;

        if response.status() == 200 || response.status() == 201 {
            let body_bytes = response.body();
            let json: serde_json::Value = serde_json::from_slice(body_bytes).map_err(|e| 
                AlbergueError::ExternalServiceError(format!("Failed to parse Twilio response: {}", e))
            )?;
            Ok(json["sid"].as_str().unwrap_or("unknown").to_string())
        } else {
             let body_str = String::from_utf8_lossy(response.body());
             Err(AlbergueError::ExternalServiceError(format!("Twilio error: {}", body_str)))
        }
    }
}

#[async_trait]
impl SmsPort for TwilioAdapter {
    async fn send_sms(&self, notification: &Notification) -> AlbergueResult<String> {
        self.send_message(
            &notification.recipient,
            &self.phone_number,
            &notification.message,
        )
        .await
    }

    async fn send_whatsapp(&self, notification: &Notification) -> AlbergueResult<String> {
        let whatsapp_to = if notification.recipient.starts_with("whatsapp:") {
            notification.recipient.clone()
        } else {
            format!("whatsapp:{}", notification.recipient)
        };

        self.send_message(&whatsapp_to, &self.whatsapp_number, &notification.message)
            .await
    }

    async fn verify_twilio_connection(&self) -> AlbergueResult<bool> {
        let url = format!(
            "https://api.twilio.com/2010-04-01/Accounts/{}.json",
            self.account_sid
        );
        
        let auth = format!("{}:{}", self.account_sid, self.auth_token);
        let auth_header = format!("Basic {}", base64::engine::general_purpose::STANDARD.encode(auth));

        let req = Request::builder()
            .method(Method::Get)
            .uri(url)
            .header("Authorization", auth_header)
            .body(vec![])
            .build();

        match spin_sdk::http::send(req).await {
            Ok(response) => Ok(response.status() == 200),
            Err(_) => Ok(false),
        }
    }
}
