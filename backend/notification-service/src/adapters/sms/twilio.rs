use crate::domain::Notification;
use crate::ports::SmsPort;
use async_trait::async_trait;
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

        let mut headers = worker::Headers::new();
        headers.set("Authorization", &auth_header).map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to set header: {}", e))
        )?;
        headers.set("Content-Type", "application/x-www-form-urlencoded").map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to set header: {}", e))
        )?;

        let mut init = worker::RequestInit::new();
        init.with_method(worker::Method::Post);
        init.with_headers(headers);
        init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body_content)));

        let request = worker::Request::new_with_init(&url, &init).map_err(|e|
            AlbergueError::ExternalServiceError(format!("Failed to create request: {}", e))
        )?;

        let mut response = worker::Fetch::Request(request).send().await.map_err(|e|
            AlbergueError::ExternalServiceError(format!("Twilio request failed: {}", e))
        )?;

        let status = response.status_code();
        if status == 200 || status == 201 {
            let text = response.text().await.map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to read Twilio response: {}", e))
            )?;
            let json: serde_json::Value = serde_json::from_str(&text).map_err(|e|
                AlbergueError::ExternalServiceError(format!("Failed to parse Twilio response: {}", e))
            )?;
            Ok(json["sid"].as_str().unwrap_or("unknown").to_string())
        } else {
            let body_str = response.text().await.unwrap_or_default();
            Err(AlbergueError::ExternalServiceError(format!("Twilio error: {}", body_str)))
        }
    }
}

#[async_trait(?Send)]
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

        let mut headers = worker::Headers::new();
        let _ = headers.set("Authorization", &auth_header);

        let mut init = worker::RequestInit::new();
        init.with_method(worker::Method::Get);
        init.with_headers(headers);

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
