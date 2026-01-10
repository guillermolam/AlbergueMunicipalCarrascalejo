use crate::domain::Notification;
use crate::ports::SmsPort;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;
use shared::{AlbergueError, AlbergueResult};
use std::collections::HashMap;

pub struct TwilioAdapter {
    client: Client,
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
            client: Client::new(),
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

        let response = self
            .client
            .post(&url)
            .basic_auth(&self.account_sid, Some(&self.auth_token))
            .form(&params)
            .send()
            .await
            .map_err(|e| {
                AlbergueError::ExternalServiceError(format!("Twilio request failed: {}", e))
            })?;

        if response.status().is_success() {
            let result: serde_json::Value = response.json().await.map_err(|e| {
                AlbergueError::ExternalServiceError(format!(
                    "Failed to parse Twilio response: {}",
                    e
                ))
            })?;

            Ok(result["sid"].as_str().unwrap_or("unknown").to_string())
        } else {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            Err(AlbergueError::ExternalServiceError(format!(
                "Twilio error: {}",
                error_text
            )))
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

        match self
            .client
            .get(&url)
            .basic_auth(&self.account_sid, Some(&self.auth_token))
            .send()
            .await
        {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}
