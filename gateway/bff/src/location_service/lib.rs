use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/api/location/search") => {
            let response_body = serde_json::json!({
                "locations": [
                    {
                        "name": "Mérida Historic Center",
                        "latitude": 38.9165,
                        "longitude": -6.3363,
                        "distance": "0.5km"
                    },
                    {
                        "name": "Roman Theatre",
                        "latitude": 38.9156,
                        "longitude": -6.3356,
                        "distance": "0.8km"
                    }
                ]
            }).to_string();

            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        },
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Location endpoint not found"
            }).to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}