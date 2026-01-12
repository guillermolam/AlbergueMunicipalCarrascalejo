#![deny(warnings)]
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]
#![allow(clippy::missing_errors_doc)]
#![allow(clippy::missing_panics_doc)]

use shared::{AlbergueError, AlbergueResult};
use wasm_bindgen::prelude::*;

mod adapters;
mod application;
mod domain;
mod infrastructure;
mod ports;

pub use application::*;
pub use domain::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct NotificationService {
    service: application::NotificationServiceImpl,
}

#[wasm_bindgen]
impl NotificationService {
    #[wasm_bindgen(constructor)]
    pub fn new() -> NotificationService {
        let service = application::NotificationServiceImpl::new();
        NotificationService { service }
    }

    #[wasm_bindgen]
    pub async fn send_email(
        &self,
        recipient: &str,
        subject: &str,
        content: &str,
    ) -> Result<String, JsValue> {
        self.service
            .send_email(recipient, subject, content)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn send_sms(&self, recipient: &str, message: &str) -> Result<String, JsValue> {
        self.service
            .send_sms(recipient, message)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn send_whatsapp(&self, recipient: &str, message: &str) -> Result<String, JsValue> {
        self.service
            .send_whatsapp(recipient, message)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn send_telegram(&self, chat_id: &str, message: &str) -> Result<String, JsValue> {
        self.service
            .send_telegram(chat_id, message)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn send_booking_confirmation(&self, booking_data: &str) -> Result<String, JsValue> {
        self.service
            .send_booking_confirmation(booking_data)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn send_payment_receipt(&self, payment_data: &str) -> Result<String, JsValue> {
        self.service
            .send_payment_receipt(payment_data)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[tokio::main]
async fn main() -> AlbergueResult<()> {
    infrastructure::config::init_logging();
    let server = infrastructure::server::create_server().await?;
    server.run().await
}
