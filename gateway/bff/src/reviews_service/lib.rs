use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", path) if path.starts_with("/api/reviews/list") => {
            let response_body = serde_json::json!({
                "reviews": [
                    {
                        "id": "review_1",
                        "rating": 5,
                        "comment": "Great place to stay!",
                        "guest_name": "Jane Smith"
                    }
                ],
                "total": 1
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
                "message": "Reviews endpoint not found"
            }).to_string();

            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(error_body)
                .build())
        }
    }
}