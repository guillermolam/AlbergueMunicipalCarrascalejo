use anyhow::Result;
use serde_json::json;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();

    match path {
        "/api/location/info" => handle_location_info().await,
        "/api/location/directions" => handle_directions(req).await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Location endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_location_info() -> Result<Response> {
    let location = json!({
        "name": "Albergue del Carrascalejo",
        "address": "Carrascalejo, Extremadura, Spain",
        "coordinates": {
            "lat": 39.2436,
            "lng": -5.8739
        },
        "camino_stage": "Mérida to Alcuéscar",
        "distance_from_merida_km": 18.5
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(location.to_string())
        .build())
}

async fn handle_directions(_req: &Request) -> Result<Response> {
    // TODO: Implement directions logic
    Ok(Response::builder()
        .status(501)
        .header("Content-Type", "application/json")
        .body(json!({"error": "Not implemented yet"}).to_string())
        .build())
}