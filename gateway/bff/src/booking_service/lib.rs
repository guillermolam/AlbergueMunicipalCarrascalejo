` tags.

```
<replit_final_file>
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();

    match (method, path) {
        ("POST", "/api/booking/create") => handle_create_booking(req).await,
        ("GET", "/api/booking/list") => handle_list_bookings(req).await,
        ("GET", path) if path.starts_with("/api/booking/") => handle_get_booking(req).await,
        ("PUT", path) if path.starts_with("/api/booking/") => handle_update_booking(req).await,
        ("DELETE", path) if path.starts_with("/api/booking/") => handle_delete_booking(req).await,
        ("GET", "/api/booking/admin/stats") => handle_admin_stats(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Booking endpoint not found"
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

async fn handle_create_booking(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let booking_data: serde_json::Value = serde_json::from_str(body)?;

    let response = serde_json::json!({
        "booking_id": "booking_123456",
        "status": "confirmed",
        "guest_name": booking_data["guest_name"],
        "check_in": booking_data["check_in"],
        "created_at": chrono::Utc::now().to_rfc3339()
    });

    Ok(Response::builder()
        .status(201)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(response.to_string())
        .build())
}

async fn handle_list_bookings(_req: &Request) -> Result<Response> {
    let bookings = serde_json::json!({
        "bookings": [
            {
                "booking_id": "booking_123456",
                "guest_name": "John Doe",
                "check_in": "2024-01-20",
                "status": "confirmed"
            },
            {
                "booking_id": "booking_789012",
                "guest_name": "Jane Smith",
                "check_in": "2024-01-21",
                "status": "pending"
            }
        ],
        "total": 2
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(bookings.to_string())
        .build())
}

async fn handle_get_booking(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let booking_id = path.strip_prefix("/api/booking/").unwrap_or("unknown");

    let booking = serde_json::json!({
        "booking_id": booking_id,
        "guest_name": "John Doe",
        "check_in": "2024-01-20",
        "status": "confirmed"
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(booking.to_string())
        .build())
}

async fn handle_update_booking(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let booking_id = path.strip_prefix("/api/booking/").unwrap_or("unknown");
    let body = std::str::from_utf8(req.body())?;
    let update_data: serde_json::Value = serde_json::from_str(body)?;

    let updated_booking = serde_json::json!({
        "booking_id": booking_id,
        "guest_name": update_data["guest_name"],
        "check_in": update_data["check_in"],
        "status": "updated",
        "updated_at": chrono::Utc::now().to_rfc3339()
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(updated_booking.to_string())
        .build())
}

async fn handle_delete_booking(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let booking_id = path.strip_prefix("/api/booking/").unwrap_or("unknown");

    let response = serde_json::json!({
        "booking_id": booking_id,
        "status": "deleted",
        "deleted_at": chrono::Utc::now().to_rfc3339()
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(response.to_string())
        .build())
}

async fn handle_admin_stats(_req: &Request) -> Result<Response> {
    let stats = serde_json::json!({
        "total_bookings": 150,
        "pending_bookings": 12,
        "confirmed_bookings": 138,
        "occupancy_rate": 85.5,
        "revenue_today": 1250.75
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(stats.to_string())
        .build())
}