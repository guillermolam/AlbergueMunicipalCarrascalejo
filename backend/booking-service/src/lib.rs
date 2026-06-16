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

use serde::{Deserialize, Serialize};
use spin_sdk::http::{Request, Response, ResponseBuilder};
use spin_sdk::http_component;
use std::env;
use storage::InMemoryStorage;

#[derive(Deserialize)]
struct CreateBookingRequest {
    guest_name: Option<String>,
    guest_email: Option<String>,
    guest_phone: Option<String>,
    room_type: Option<String>,
    check_in: Option<String>,
    check_out: Option<String>,
    num_guests: Option<i32>,
    total_price: Option<i32>,
}

#[http_component]
fn handle_request(req: Request) -> Response {
    let storage = InMemoryStorage;
    handler::handle_request(req, &storage)
}

fn create_booking(req: Request, storage: &dyn storage::StoragePort) -> Response {
    let body: CreateBookingRequest = match serde_json::from_slice(req.body()) {
        Ok(json) => json,
        Err(err) => return error_response(400, &format!("Invalid JSON: {err}")),
    };

    let guest_phone = body.guest_phone.filter(|phone| !phone.is_empty());
    maybe_register_whatsapp(guest_phone.as_deref());

    let new_booking = Booking {
        id: "new_id".to_string(),
        guest_name: body
            .guest_name
            .filter(|item| !item.is_empty())
            .unwrap_or_else(|| "New Guest".to_string()),
        guest_email: body
            .guest_email
            .filter(|item| !item.is_empty())
            .unwrap_or_else(|| "guest@example.com".to_string()),
        guest_phone,
        room_type: body
            .room_type
            .filter(|item| !item.is_empty())
            .unwrap_or_else(|| "dorm-a".to_string()),
        check_in: body
            .check_in
            .filter(|item| !item.is_empty())
            .unwrap_or_else(|| "2024-01-20".to_string()),
        check_out: body
            .check_out
            .filter(|item| !item.is_empty())
            .unwrap_or_else(|| "2024-01-21".to_string()),
        num_guests: body.num_guests.unwrap_or(1),
        total_price: body.total_price.unwrap_or(1500),
        status: "confirmed".to_string(),
        payment_status: "pending".to_string(),
    };

    let new_booking = storage.create_booking(new_booking);

    json_response(201, &new_booking)
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

fn register_whatsapp_client() {
    println!("Registering WhatsApp client with configured business phone");
}

fn maybe_register_whatsapp(guest_phone: Option<&str>) {
    if guest_phone.is_none() {
        return;
    }

    let Ok(whatsapp_business_phone) = env::var("WHATSAPP_BUSINESS_NUMBER") else {
        return;
    };

    let Ok(whatsapp_enabled) = env::var("WHATSAPP_ENABLED") else {
        return;
    };

    if whatsapp_enabled.eq_ignore_ascii_case("true") && !whatsapp_business_phone.is_empty() {
        register_whatsapp_client();
    }
}
