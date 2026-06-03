#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::module_name_repetitions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    // Spin's http component executor is not Send; allow this lint for WASM components.
    clippy::future_not_send,
    // Spin SDK macro generates Vec::from_raw_parts with same length and capacity.
    clippy::same_length_and_capacity,
    // Spin handler signature requires owned Request.
    clippy::needless_pass_by_value
)]

use serde::{Deserialize, Serialize};
use spin_sdk::http::{Method, Request, Response, ResponseBuilder};
use spin_sdk::http_component;

// Import shared constants
mod shared;
pub use shared::constants::*;

// Import storage port
mod storage;
use storage::{InMemoryStorage, StoragePort};

use serde_json::Value;
use std::env;

#[http_component]
fn handle_request(req: Request) -> Response {
    // Create an in-memory storage instance (in real implementation, this would be configured)
    let storage = InMemoryStorage;
    // Delegate to the HTTP handler with the storage
    handler::handle_request(req, &storage)
}

// Business logic functions now take a storage port
fn get_bookings(storage: &dyn StoragePort) -> Response {
    let bookings = storage.get_bookings();
    json_response(200, &bookings)
}

fn create_booking(req: Request, storage: &dyn StoragePort) -> Response {
    // Parse request body with error handling
    let body_bytes = req.body();
    let body_json: Value = match serde_json::from_slice(body_bytes) {
        Ok(json) => json,
        Err(err) => return error_response(400, &format!("Invalid JSON: {err}")),
    };

    let guest_phone = body_json
        .get("guest_phone")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Read WhatsApp business phone number from env
    let whatsapp_business_phone = env::var("WHATSAPP_BUSINESS_NUMBER").unwrap_or_default();

    // Make WhatsApp integration optional: only register if both numbers are present and feature is enabled
    let whatsapp_enabled =
        env::var("WHATSAPP_ENABLED").unwrap_or_else(|_| "true".to_string()) == "true";
    if whatsapp_enabled && !guest_phone.is_empty() && !whatsapp_business_phone.is_empty() {
        register_whatsapp_client(guest_phone, &whatsapp_business_phone);
    }

    // Create booking as before (not storing it in storage for simplicity)
    let new_booking = Booking {
        id: "new_id".to_string(),
        guest_name: body_json
            .get("guest_name")
            .and_then(|v| v.as_str())
            .unwrap_or("New Guest")
            .to_string(),
        guest_email: body_json
            .get("guest_email")
            .and_then(|v| v.as_str())
            .unwrap_or("guest@example.com")
            .to_string(),
        guest_phone: if guest_phone.is_empty() {
            None
        } else {
            Some(guest_phone.to_string())
        },
        room_type: body_json
            .get("room_type")
            .and_then(|v| v.as_str())
            .unwrap_or("dorm-a")
            .to_string(),
        check_in: body_json
            .get("check_in")
            .and_then(|v| v.as_str())
            .unwrap_or("2024-01-20")
            .to_string(),
        check_out: body_json
            .get("check_out")
            .and_then(|v| v.as_str())
            .unwrap_or("2024-01-21")
            .to_string(),
        num_guests: body_json
            .get("num_guests")
            .and_then(serde_json::Value::as_i64)
            .unwrap_or(1) as i32,
        total_price: body_json
            .get("total_price")
            .and_then(serde_json::Value::as_i64)
            .unwrap_or(1500) as i32,
        status: "confirmed".to_string(),
        payment_status: "pending".to_string(),
    };

    json_response(201, &new_booking)
}

fn get_dashboard_stats(storage: &dyn StoragePort) -> Response {
    let stats = storage.get_dashboard_stats();
    json_response(200, &stats)
}

fn get_pricing(storage: &dyn StoragePort) -> Response {
    let pricing = storage.get_pricing();
    json_response(200, &pricing)
}

fn get_rooms(storage: &dyn StoragePort) -> Response {
    let rooms = storage.get_rooms();
    json_response(200, &rooms)
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

// Placeholder for WhatsApp registration
fn register_whatsapp_client(client_phone: &str, business_phone: &str) {
    // Placeholder: Implement WhatsApp API call to register client
    println!("Registering WhatsApp client {client_phone} with business phone {business_phone}");
}

// HTTP handler module
mod handler {
    use super::*;
    use spin_sdk::http::{Method, Request, Response};

    pub fn handle_request(req: Request, storage: &dyn StoragePort) -> Response {
        let method = req.method();
        let path = req.uri();

        match (method, path) {
            (&Method::Get, "/bookings") => get_bookings(storage),
            (&Method::Post, "/bookings") => create_booking(req, storage),
            (&Method::Get, "/rooms") => get_rooms(storage),
            (&Method::Get, "/dashboard/stats") => get_dashboard_stats(storage),
            (&Method::Get, "/pricing") => get_pricing(storage),
            _ => error_response(404, "Not found"),
        }
    }
}
