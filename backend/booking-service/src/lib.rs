#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::module_name_repetitions,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::cast_precision_loss,
    clippy::needless_pass_by_value,
    clippy::future_not_send
)]

use serde::{Deserialize, Serialize};
use worker::{console_log, event, Context, Env, Method, Request, Response, Result};

#[derive(Serialize, Deserialize)]
pub struct Booking {
    pub id: String,
    pub guest_name: String,
    pub guest_email: String,
    pub guest_phone: Option<String>,
    pub room_type: String,
    pub check_in: String,
    pub check_out: String,
    pub num_guests: i32,
    pub total_price: i32,
    pub status: String,
    pub payment_status: String,
}

#[derive(Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub type_: String,
    pub capacity: i32,
    pub price_per_night: i32,
    pub amenities: Vec<String>,
    pub available: bool,
}

#[derive(Serialize, Deserialize)]
pub struct DashboardStats {
    pub occupancy: OccupancyStats,
    pub today_bookings: i32,
    pub revenue: i32,
}

#[derive(Serialize, Deserialize)]
pub struct OccupancyStats {
    pub available: i32,
    pub occupied: i32,
    pub total: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Pricing {
    pub dormitory: i32,
}

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let path = req.path();

    let mut response = match (method, path.as_str()) {
        (Method::Get, "/bookings") => get_bookings(),
        (Method::Post, "/bookings") => create_booking(&mut req).await,
        (Method::Get, "/rooms") => get_rooms(),
        (Method::Get, "/dashboard/stats") => get_dashboard_stats(),
        (Method::Get, "/pricing") => get_pricing(),
        _ => error_response(404, "Not found"),
    }?;

    add_cors_headers(&mut response)?;
    Ok(response)
}

fn add_cors_headers(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")?;
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    )?;
    Ok(())
}

use serde_json::Value;

fn register_whatsapp_client(client_phone: &str, business_phone: &str) {
    // Placeholder: Implement WhatsApp API call to register client
    console_log!(
        "Registering WhatsApp client {} with business phone {}",
        client_phone,
        business_phone
    );
}

async fn create_booking(req: &mut Request) -> Result<Response> {
    let body_text = req.text().await?;
    let body_json: Value = match serde_json::from_str(&body_text) {
        Ok(json) => json,
        Err(err) => return error_response(400, &format!("Invalid JSON: {err}")),
    };

    let guest_phone = body_json
        .get("guest_phone")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // Read WhatsApp business phone number from env (not available in Workers, use empty default)
    let whatsapp_business_phone = String::new();

    if !guest_phone.is_empty() && !whatsapp_business_phone.is_empty() {
        register_whatsapp_client(guest_phone, &whatsapp_business_phone);
    }

    // Create booking as before
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

fn get_dashboard_stats() -> Result<Response> {
    let stats = DashboardStats {
        occupancy: OccupancyStats {
            available: 24,
            occupied: 0,
            total: 24,
        },
        today_bookings: 3,
        revenue: 4500,
    };

    json_response(200, &stats)
}

fn get_pricing() -> Result<Response> {
    let pricing = Pricing { dormitory: 15 };

    json_response(200, &pricing)
}

fn get_rooms() -> Result<Response> {
    let rooms = vec![
        Room {
            id: "dorm-a".to_string(),
            name: "Dormitorio A".to_string(),
            type_: "shared".to_string(),
            capacity: 12,
            price_per_night: 1500,
            amenities: vec![
                "Taquillas".to_string(),
                "Enchufes".to_string(),
                "Ventanas".to_string(),
            ],
            available: true,
        },
        Room {
            id: "dorm-b".to_string(),
            name: "Dormitorio B".to_string(),
            type_: "shared".to_string(),
            capacity: 10,
            price_per_night: 1500,
            amenities: vec![
                "Taquillas".to_string(),
                "Enchufes".to_string(),
                "Aire acondicionado".to_string(),
            ],
            available: true,
        },
        Room {
            id: "private-1".to_string(),
            name: "Habitación Privada 1".to_string(),
            type_: "private".to_string(),
            capacity: 2,
            price_per_night: 3500,
            amenities: vec![
                "Baño privado".to_string(),
                "TV".to_string(),
                "Aire acondicionado".to_string(),
            ],
            available: true,
        },
        Room {
            id: "private-2".to_string(),
            name: "Habitación Privada 2".to_string(),
            type_: "private".to_string(),
            capacity: 2,
            price_per_night: 3500,
            amenities: vec![
                "Baño privado".to_string(),
                "TV".to_string(),
                "Aire acondicionado".to_string(),
            ],
            available: true,
        },
    ];

    json_response(200, &rooms)
}

fn get_bookings() -> Result<Response> {
    let bookings = vec![Booking {
        id: "1".to_string(),
        guest_name: "Juan Pérez".to_string(),
        guest_email: "juan@example.com".to_string(),
        guest_phone: Some("+34666123456".to_string()),
        room_type: "dorm-a".to_string(),
        check_in: "2024-01-15".to_string(),
        check_out: "2024-01-16".to_string(),
        num_guests: 1,
        total_price: 1500,
        status: "confirmed".to_string(),
        payment_status: "paid".to_string(),
    }];

    json_response(200, &bookings)
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Result<Response> {
    match serde_json::to_string(body) {
        Ok(json) => {
            let mut response = Response::ok(json)?;
            response
                .headers_mut()
                .set("content-type", "application/json")?;
            let response = response.with_status(status);
            Ok(response)
        }
        Err(err) => error_response(500, &format!("Failed to serialize response body: {err}")),
    }
}

fn error_response(status: u16, message: &str) -> Result<Response> {
    json_response(status, &serde_json::json!({ "error": message }))
}
