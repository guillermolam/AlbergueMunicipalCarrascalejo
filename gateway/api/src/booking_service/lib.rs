use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/api/booking/list") => {
            let response_body = serde_json::json!({
                "bookings": [
                    {
                        "id": "booking_1",
                        "guest_name": "John Doe",
                        "check_in": "2024-01-20",
                        "check_out": "2024-01-21",
                        "status": "confirmed"
                    }
                ],
                "total": 1
            })
            .to_string();

            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        }
        ("POST", "/api/booking/create") => {
            let response_body = serde_json::json!({
                "id": "booking_new",
                "status": "created",
                "message": "Booking created successfully"
            })
            .to_string();

            Ok(Response::builder()
                .status(201)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        }
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Booking endpoint not found"
            })
            .to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}
