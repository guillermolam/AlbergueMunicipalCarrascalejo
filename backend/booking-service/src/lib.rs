#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::module_name_repetitions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    clippy::future_not_send,
    clippy::same_length_and_capacity,
    clippy::needless_pass_by_value
)]

mod handler;
mod service;
mod shared;
mod storage;

pub use shared::constants::*;

use spin_sdk::http::{Request, Response, ResponseBuilder};
use spin_sdk::http_component;

use serde::Serialize;
use storage::InMemoryStorage;

#[http_component]
fn handle_request(req: Request) -> Response {
    let storage = InMemoryStorage;
    handler::handle_request(req, &storage)
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Response {
    match serde_json::to_string(body) {
        Ok(json) => ResponseBuilder::new(status)
            .header("content-type", "application/json")
            .body(json)
            .build(),
        Err(err) => error_response(500, &format!("Failed to serialize response body: {err}")),
    }
}

fn error_response(status: u16, message: &str) -> Response {
    json_response(status, &serde_json::json!({ "error": message }))
}

fn register_whatsapp_client(client_phone: &str, business_phone: &str) {
    println!("Registering WhatsApp client {client_phone} with business phone {business_phone}");
}
