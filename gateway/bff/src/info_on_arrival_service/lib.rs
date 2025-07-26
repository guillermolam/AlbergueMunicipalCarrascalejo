use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/info/cards" => handle_info_cards().await,
        "/api/info/arrival" => handle_arrival_info().await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Info endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_info_cards() -> Result<Response> {
    let cards = json!([
        {
            "id": "transport",
            "title": "Transportation",
            "description": "Taxi and bus services available",
            "category": "transport"
        },
        {
            "id": "dining",
            "title": "Local Dining",
            "description": "Restaurants and cafes nearby",
            "category": "dining"
        }
    ]);

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(cards.to_string())
        .build())
}

async fn handle_arrival_info() -> Result<Response> {
    let info = json!({
        "check_in_time": "14:00",
        "check_out_time": "11:00",
        "key_pickup": "Reception desk",
        "wifi_password": "camino2024",
        "emergency_contact": "+34 927 XXX XXX"
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(info.to_string())
        .build())
}