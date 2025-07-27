
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("GET", "/api/location/info") => handle_location_info(req).await,
        ("GET", "/api/location/weather") => handle_weather_info(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Location endpoint not found"
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

async fn handle_location_info(_req: &Request) -> Result<Response> {
    let location_info = serde_json::json!({
        "name": "Albergue Del Carrascalejo",
        "address": "Carrascalejo, Extremadura, Spain",
        "coordinates": {
            "latitude": 39.2833,
            "longitude": -5.8167
        },
        "facilities": ["WiFi", "Kitchen", "Laundry", "Bicycle storage"],
        "capacity": 20
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(location_info.to_string())
        .build())
}

async fn handle_weather_info(_req: &Request) -> Result<Response> {
    let weather = serde_json::json!({
        "location": "Carrascalejo",
        "temperature": 22,
        "condition": "sunny",
        "humidity": 65,
        "wind_speed": 8
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(weather.to_string())
        .build())
}
