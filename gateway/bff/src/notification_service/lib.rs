
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("POST", "/api/notifications/create") => handle_create_notification(req).await,
        ("GET", "/api/notifications/list") => handle_list_notifications(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Notification endpoint not found"
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

async fn handle_create_notification(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let notification_data: serde_json::Value = serde_json::from_str(body)?;
    
    let notification = serde_json::json!({
        "notification_id": format!("notif_{}", uuid::Uuid::new_v4().simple()),
        "type": notification_data["type"],
        "message": notification_data["message"],
        "recipient": notification_data["recipient"],
        "status": "sent",
        "created_at": chrono::Utc::now().to_rfc3339()
    });
    
    Ok(Response::builder()
        .status(201)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(notification.to_string())
        .build())
}

async fn handle_list_notifications(_req: &Request) -> Result<Response> {
    let notifications = serde_json::json!({
        "notifications": [
            {
                "notification_id": "notif_001",
                "type": "booking_confirmation",
                "message": "Your booking has been confirmed",
                "recipient": "guest@example.com",
                "status": "sent"
            }
        ],
        "total": 1
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(notifications.to_string())
        .build())
}
