use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/booking/dashboard/stats" => handle_dashboard_stats().await,
        "/api/booking/pricing" => handle_pricing().await,
        "/api/booking/create" => handle_create_booking(req).await,
        "/api/booking/status" => handle_booking_status(req).await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Booking endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_dashboard_stats() -> Result<Response> {
    let stats = json!({
        "total_bookings": 245,
        "pending_checkins": 8,
        "current_occupancy": 12,
        "total_capacity": 24,
        "revenue_today": 180.0,
        "average_rating": 4.6
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(stats.to_string())
        .build())
}

async fn handle_pricing() -> Result<Response> {
    let pricing = json!({
        "bed_price": 15.0,
        "breakfast_price": 5.0,
        "dinner_price": 8.0,
        "laundry_price": 3.0,
        "currency": "EUR",
        "check_in_time": "14:00",
        "check_out_time": "11:00"
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(pricing.to_string())
        .build())
}

async fn handle_create_booking(_req: &Request) -> Result<Response> {
    // TODO: Implement booking creation logic
    Ok(Response::builder()
        .status(501)
        .header("Content-Type", "application/json")
        .body(json!({"error": "Not implemented yet"}).to_string())
        .build())
}

async fn handle_booking_status(_req: &Request) -> Result<Response> {
    // TODO: Implement booking status check
    Ok(Response::builder()
        .status(501)
        .header("Content-Type", "application/json")
        .body(json!({"error": "Not implemented yet"}).to_string())
        .build())
}