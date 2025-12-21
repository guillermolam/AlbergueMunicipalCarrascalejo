use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("GET", "/api/info/cards") => {
            let response_body = serde_json::json!({
                "cards": [
                    {
                        "id": "merida_attractions",
                        "title": "Mérida Attractions",
                        "content": "Discover the historic Roman sites"
                    },
                    {
                        "id": "carrascalejo_info",
                        "title": "Carrascalejo Information",
                        "content": "Local information and services"
                    }
                ]
            })
            .to_string();

            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .body(response_body)
                .build())
        }
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Info endpoint not found"
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
