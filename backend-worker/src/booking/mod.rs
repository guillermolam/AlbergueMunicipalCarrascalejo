use serde::{Deserialize, Serialize};
use worker::*;

#[allow(dead_code)]
#[derive(Serialize, Deserialize)]
pub struct Booking {
    pub id: String,
    pub guest_name: String,
    pub guest_email: String,
    pub guest_phone: Option<String>,
    pub room_type: String,
    pub check_in: String,
    pub check_out: String,
    pub num_guests: i32,
    pub total_price: i32,
    pub status: String,
    pub payment_status: String,
}

#[allow(dead_code)]
#[derive(Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub room_type: String,
    pub capacity: i32,
    pub price_per_night: i32,
    pub amenities: Vec<String>,
    pub available: bool,
}

pub async fn get_bookings(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let results = db
        .prepare("SELECT * FROM bookings ORDER BY check_in DESC LIMIT 50")
        .all()
        .await?;

    Response::from_json(&results.results::<serde_json::Value>()?)
}

pub async fn create_booking(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let db = ctx.env.d1("DB")?;

    let id = uuid::Uuid::new_v4().to_string();
    let guest_name = body["guest_name"].as_str().unwrap_or("");
    let guest_email = body["guest_email"].as_str().unwrap_or("");
    let room_type = body["room_type"].as_str().unwrap_or("dormitory");
    let check_in = body["check_in"].as_str().unwrap_or("");
    let check_out = body["check_out"].as_str().unwrap_or("");
    let num_guests = body["num_guests"].as_i64().unwrap_or(1);

    db.prepare(
        "INSERT INTO bookings (id, guest_name, guest_email, room_type, check_in, check_out, num_guests, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')",
    )
    .bind(&[
        id.clone().into(),
        guest_name.into(),
        guest_email.into(),
        room_type.into(),
        check_in.into(),
        check_out.into(),
        num_guests.into(),
    ])?
    .run()
    .await?;

    // Publish booking event to queue
    if let Ok(queue) = ctx.env.queue("BOOKING_EVENTS") {
        let _ = queue
            .send(
                serde_json::json!({
                    "type": "booking_created",
                    "booking_id": id,
                    "email": guest_email
                })
                .to_string(),
            )
            .await;
    }

    Response::from_json(&serde_json::json!({
        "id": id,
        "status": "pending",
        "message": "Booking created successfully"
    }))
}

pub async fn get_rooms(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let results = db
        .prepare("SELECT * FROM beds WHERE status = 'available'")
        .all()
        .await?;

    Response::from_json(&results.results::<serde_json::Value>()?)
}

pub async fn get_dashboard_stats(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    let total = db
        .prepare("SELECT COUNT(*) as count FROM beds")
        .first::<serde_json::Value>(None)
        .await?;

    let occupied = db
        .prepare("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'")
        .first::<serde_json::Value>(None)
        .await?;

    let today_bookings = db
        .prepare("SELECT COUNT(*) as count FROM bookings WHERE check_in = date('now')")
        .first::<serde_json::Value>(None)
        .await?;

    Response::from_json(&serde_json::json!({
        "occupancy": {
            "total": total.map(|v| v["count"].clone()).unwrap_or(serde_json::json!(0)),
            "occupied": occupied.map(|v| v["count"].clone()).unwrap_or(serde_json::json!(0)),
        },
        "today_bookings": today_bookings.map(|v| v["count"].clone()).unwrap_or(serde_json::json!(0))
    }))
}

pub async fn get_pricing(_req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    Response::from_json(&serde_json::json!({
        "dormitory": 800,
        "currency": "EUR",
        "per_night": true
    }))
}
