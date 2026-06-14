use serde::Deserialize;
use spin_sdk::http::{Request, Response};
use std::env;

use crate::shared::constants::Booking;
use crate::storage::StoragePort;
use crate::{error_response, json_response, register_whatsapp_client};

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

pub fn get_bookings(storage: &dyn StoragePort) -> Response {
    let bookings = storage.snapshot().bookings;
    json_response(200, &bookings)
}

pub fn create_booking(req: Request, _storage: &dyn StoragePort) -> Response {
    let body: CreateBookingRequest = match serde_json::from_slice(req.body()) {
        Ok(json) => json,
        Err(err) => return error_response(400, &format!("Invalid JSON: {err}")),
    };

    let guest_phone = body.guest_phone.filter(|phone| !phone.is_empty());
    maybe_register_whatsapp(guest_phone.as_deref());

    let new_booking = Booking {
        id: "new_id".to_string(),
        guest_name: string_or_default(body.guest_name, "New Guest"),
        guest_email: string_or_default(body.guest_email, "guest@example.com"),
        guest_phone,
        room_type: string_or_default(body.room_type, "dorm-a"),
        check_in: string_or_default(body.check_in, "2024-01-20"),
        check_out: string_or_default(body.check_out, "2024-01-21"),
        num_guests: body.num_guests.unwrap_or(1),
        total_price: body.total_price.unwrap_or(1500),
        status: "confirmed".to_string(),
        payment_status: "pending".to_string(),
    };

    json_response(201, &new_booking)
}

pub fn get_dashboard_stats(storage: &dyn StoragePort) -> Response {
    let stats = storage.snapshot().dashboard_stats;
    json_response(200, &stats)
}

pub fn get_pricing(storage: &dyn StoragePort) -> Response {
    let pricing = storage.snapshot().pricing;
    json_response(200, &pricing)
}

pub fn get_rooms(storage: &dyn StoragePort) -> Response {
    let rooms = storage.snapshot().rooms;
    json_response(200, &rooms)
}

fn string_or_default(value: Option<String>, default: &str) -> String {
    value
        .filter(|item| !item.is_empty())
        .unwrap_or_else(|| default.to_string())
}

fn maybe_register_whatsapp(guest_phone: Option<&str>) {
    let Some(guest_phone) = guest_phone else {
        return;
    };

    let Ok(whatsapp_business_phone) = env::var("WHATSAPP_BUSINESS_NUMBER") else {
        return;
    };

    let whatsapp_enabled = env::var("WHATSAPP_ENABLED").map_or(true, |value| value == "true");
    if whatsapp_enabled && !whatsapp_business_phone.is_empty() {
        register_whatsapp_client(guest_phone, &whatsapp_business_phone);
    }
}
