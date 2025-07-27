
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("GET", "/api/info/cards") => handle_info_cards(req).await,
        ("GET", "/api/info/restaurants") => handle_restaurants(req).await,
        ("GET", "/api/info/transport") => handle_transport(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Info endpoint not found"
            });
            
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(error_body.to_string())
                .build())
        }
    }
}

async fn handle_info_cards(_req: &Request) -> Result<Response> {
    let cards = serde_json::json!({
        "cards": [
            {
                "id": "eat",
                "title": "Where to Eat",
                "icon": "restaurant",
                "description": "Local restaurants and cafés",
                "items": ["Bar Central", "Restaurante El Peregrino", "Café Plaza"]
            },
            {
                "id": "transport",
                "title": "Transportation",
                "icon": "bus",
                "description": "Buses, taxis and car rentals",
                "items": ["Local Bus", "Taxi Service", "Car Rental"]
            }
        ]
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(cards.to_string())
        .build())
}

async fn handle_restaurants(_req: &Request) -> Result<Response> {
    let restaurants = serde_json::json!({
        "restaurants": [
            {
                "name": "Bar Central",
                "address": "Plaza Mayor, 1",
                "phone": "+34 927 123 456",
                "cuisine": "Spanish",
                "rating": 4.2
            }
        ]
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(restaurants.to_string())
        .build())
}

async fn handle_transport(_req: &Request) -> Result<Response> {
    let transport = serde_json::json!({
        "transport": [
            {
                "type": "taxi",
                "name": "Taxi Carrascalejo",
                "phone": "+34 927 987 654",
                "available_24h": false
            }
        ]
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(transport.to_string())
        .build())
}
