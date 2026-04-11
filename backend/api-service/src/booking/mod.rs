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
    let guest_name  = body["guest_name"].as_str().unwrap_or("");
    let guest_email = body["guest_email"].as_str().unwrap_or("");
    let room_type   = body["room_type"].as_str().unwrap_or("dormitory");
    let check_in    = body["check_in"].as_str().unwrap_or("");
    let check_out   = body["check_out"].as_str().unwrap_or("");
    let num_guests  = body["num_guests"].as_i64().unwrap_or(1);

    // Resolve effective price from pricing_rules for check_in date
    let price_row = db
        .prepare(
            "SELECT price_cents FROM pricing_rules \
             WHERE accommodation_type = ? AND active = 1 \
               AND (valid_from  IS NULL OR valid_from  <= ?) \
               AND (valid_until IS NULL OR valid_until >= ?) \
             ORDER BY CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END DESC, \
                      valid_from DESC \
             LIMIT 1",
        )
        .bind(&[room_type.into(), check_in.into(), check_in.into()])?
        .first::<serde_json::Value>(None)
        .await?;
    let price_cents = price_row
        .as_ref()
        .and_then(|r| r["price_cents"].as_i64())
        .unwrap_or(800);

    // Days count for total price
    let nights = body["nights"].as_i64().unwrap_or(1);
    let total_price = price_cents * nights;

    db.prepare(
        "INSERT INTO bookings \
            (id, guest_name, guest_email, room_type, check_in, check_out, \
             num_guests, total_price, status, payment_status) \
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid')",
    )
    .bind(&[
        id.clone().into(),
        guest_name.into(),
        guest_email.into(),
        room_type.into(),
        check_in.into(),
        check_out.into(),
        (num_guests as i32).into(),
        (total_price as i32).into(),
    ])?
    .run()
    .await?;

    // Publish booking event to queue (optional — queue may not be configured locally)
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
        "total_price_cents": total_price,
        "message": "Booking created successfully"
    }))
}

/// GET /api/rooms — list dormitories with capacity from the configurable table
pub async fn get_rooms(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let rows = db
        .prepare(
            "SELECT d.id, d.name, d.room_type, d.beds_count, d.active, \
                    COALESCE( \
                        (SELECT COUNT(*) FROM beds b \
                          WHERE b.room_number = d.name AND b.status = 'occupied'), 0 \
                    ) AS occupied \
             FROM dormitories d WHERE d.active = 1",
        )
        .all()
        .await?;

    let dorms = rows.results::<serde_json::Value>()?;

    // Enrich with effective price
    let price_row = db
        .prepare(
            "SELECT price_cents FROM pricing_rules \
             WHERE accommodation_type = 'dormitory' AND active = 1 \
               AND (valid_from IS NULL OR valid_from <= date('now')) \
               AND (valid_until IS NULL OR valid_until >= date('now')) \
             ORDER BY CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END DESC, valid_from DESC \
             LIMIT 1",
        )
        .first::<serde_json::Value>(None)
        .await?;
    let price_cents = price_row
        .as_ref()
        .and_then(|r| r["price_cents"].as_i64())
        .unwrap_or(800);

    let rooms: Vec<serde_json::Value> = dorms
        .into_iter()
        .map(|d| {
            let beds  = d["beds_count"].as_i64().unwrap_or(0);
            let occ   = d["occupied"].as_i64().unwrap_or(0);
            serde_json::json!({
                "id":               d["id"],
                "name":             d["name"],
                "room_type":        d["room_type"],
                "beds_count":       beds,
                "occupied":         occ,
                "available":        beds - occ,
                "price_cents":      price_cents,
                "price_eur":        price_cents as f64 / 100.0,
                "active":           d["active"]
            })
        })
        .collect();

    Response::from_json(&rooms)
}

/// GET /api/dashboard/stats — live occupancy from dormitories + bookings
pub async fn get_dashboard_stats(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    // Total capacity = sum of beds_count across active dormitories
    let capacity = db
        .prepare("SELECT COALESCE(SUM(beds_count), 0) AS total FROM dormitories WHERE active = 1")
        .first::<serde_json::Value>(None)
        .await?;
    let total = capacity
        .as_ref()
        .and_then(|v| v["total"].as_i64())
        .unwrap_or(24);

    // Occupied = beds currently checked-in (from beds table)
    let occ_row = db
        .prepare("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'")
        .first::<serde_json::Value>(None)
        .await?;
    let occupied = occ_row
        .as_ref()
        .and_then(|v| v["count"].as_i64())
        .unwrap_or(0);

    // Today's new bookings
    let today_row = db
        .prepare("SELECT COUNT(*) as count FROM bookings WHERE check_in = date('now')")
        .first::<serde_json::Value>(None)
        .await?;
    let today_bookings = today_row
        .as_ref()
        .and_then(|v| v["count"].as_i64())
        .unwrap_or(0);

    Response::from_json(&serde_json::json!({
        "occupancy": {
            "total":     total,
            "occupied":  occupied,
            "available": total - occupied
        },
        "today_bookings": today_bookings
    }))
}

/// GET /api/pricing — effective price for today from pricing_rules table
pub async fn get_pricing(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    let row = db
        .prepare(
            "SELECT price_cents, currency, label, valid_from, valid_until \
             FROM pricing_rules \
             WHERE accommodation_type = 'dormitory' AND active = 1 \
               AND (valid_from  IS NULL OR valid_from  <= date('now')) \
               AND (valid_until IS NULL OR valid_until >= date('now')) \
             ORDER BY CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END DESC, \
                      valid_from DESC \
             LIMIT 1",
        )
        .first::<serde_json::Value>(None)
        .await?;

    let (cents, currency, label) = match row {
        Some(ref r) => (
            r["price_cents"].as_i64().unwrap_or(800),
            r["currency"].as_str().unwrap_or("EUR").to_string(),
            r["label"].as_str().unwrap_or("Tarifa estándar").to_string(),
        ),
        None => (800, "EUR".into(), "Tarifa estándar".into()),
    };

    Response::from_json(&serde_json::json!({
        "dormitory":   cents,
        "price_cents": cents,
        "price_eur":   cents as f64 / 100.0,
        "currency":    currency,
        "label":       label,
        "per_night":   true
    }))
}

/// GET /api/accommodation/services — hostel services from hostel_services table
pub async fn get_services(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let results = db
        .prepare(
            "SELECT id, name, description, icon, price_cents, unit, available, category \
             FROM hostel_services ORDER BY id",
        )
        .all()
        .await?;

    let rows = results.results::<serde_json::Value>()?;
    let services: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            let cents = r["price_cents"].as_i64().unwrap_or(0);
            serde_json::json!({
                "id":          r["id"],
                "name":        r["name"],
                "description": r["description"],
                "icon":        r["icon"],
                "price":       cents as f64 / 100.0,
                "price_cents": cents,
                "unit":        r["unit"],
                "available":   r["available"].as_i64().unwrap_or(1) == 1,
                "category":    r["category"]
            })
        })
        .collect();

    Response::from_json(&services)
}

/// GET /api/info/hostel — full hostel config (contact, legal, hours)
pub async fn get_hostel_info(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;
    let row = db
        .prepare("SELECT * FROM hostel_config WHERE id = 1")
        .first::<serde_json::Value>(None)
        .await?;

    match row {
        Some(r) => Response::from_json(&r),
        None => Response::from_json(&serde_json::json!({
            "name":             "Albergue Municipal de El Carrascalejo",
            "tagline":          "Camino de Santiago — Vía de la Plata",
            "address_street":   "Calle del Camino, s/n",
            "address_postcode": "06910",
            "address_town":     "El Carrascalejo",
            "address_province": "Badajoz",
            "address_country":  "España",
            "phone":            "+34 924 XXX XXX",
            "email":            "info@alberguecarrascalejo.es",
            "cif":              "X-00000000",
            "tourism_license":  "H-CC-0023",
            "insurance_policy": "XXXX-XXXX",
            "check_in_time":    "14:00",
            "check_out_time":   "10:00",
            "reception_hours":  "08:00–22:00"
        })),
    }
}

/// GET /api/availability/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
/// Returns per-day availability (beds free) + effective price for the calendar widget.
pub async fn get_availability_calendar(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    let from = params.get("from").cloned().unwrap_or_default();
    let to   = params.get("to").cloned().unwrap_or_default();

    // Basic validation
    let re = regex::Regex::new(r"^\d{4}-\d{2}-\d{2}$").unwrap();
    if !re.is_match(&from) || !re.is_match(&to) || from > to {
        return Response::error("Query params from and to must be YYYY-MM-DD", 400);
    }

    let db = ctx.env.d1("DB")?;

    // Total capacity
    let cap = db
        .prepare("SELECT COALESCE(SUM(beds_count),0) AS total FROM dormitories WHERE active=1")
        .first::<serde_json::Value>(None)
        .await?;
    let total_beds = cap.as_ref().and_then(|v| v["total"].as_i64()).unwrap_or(24);

    // Effective nightly price for the period
    let price_row = db
        .prepare(
            "SELECT price_cents FROM pricing_rules \
             WHERE accommodation_type='dormitory' AND active=1 \
               AND (valid_from IS NULL OR valid_from <= ?) \
               AND (valid_until IS NULL OR valid_until >= ?) \
             ORDER BY CASE WHEN valid_from IS NULL THEN 0 ELSE 1 END DESC, valid_from DESC \
             LIMIT 1",
        )
        .bind(&[from.clone().into(), to.clone().into()])?
        .first::<serde_json::Value>(None)
        .await?;
    let price_cents = price_row
        .as_ref()
        .and_then(|r| r["price_cents"].as_i64())
        .unwrap_or(800);
    let price_eur = price_cents as f64 / 100.0;

    // Bookings that overlap with [from, to]
    let bookings = db
        .prepare(
            "SELECT check_in, check_out, num_guests FROM bookings \
             WHERE status NOT IN ('cancelled') \
               AND check_in <= ? AND check_out >= ?",
        )
        .bind(&[to.clone().into(), from.clone().into()])?
        .all()
        .await?;
    let booking_rows = bookings.results::<serde_json::Value>()?;

    // Build day map: date → guests_booked
    let mut occupied_by_day: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for b in &booking_rows {
        let ci = b["check_in"].as_str().unwrap_or("").to_string();
        let co = b["check_out"].as_str().unwrap_or("").to_string();
        let guests = b["num_guests"].as_i64().unwrap_or(1);
        // Add guests to each night they stay (check_in ≤ night < check_out)
        if ci.len() == 10 && co.len() == 10 {
            let mut cur = ci.clone();
            while cur < co && cur >= from && cur <= to {
                *occupied_by_day.entry(cur.clone()).or_insert(0) += guests;
                // Advance date by 1 day (simple string arithmetic)
                cur = next_date(&cur);
            }
        }
    }

    // Build response: one entry per day in [from, to]
    let mut days = serde_json::Map::new();
    let mut cur = from.clone();
    while cur <= to {
        let occupied = *occupied_by_day.get(&cur).unwrap_or(&0);
        let available = (total_beds - occupied).max(0);
        days.insert(cur.clone(), serde_json::json!({
            "beds":  available,
            "price": price_eur
        }));
        cur = next_date(&cur);
    }

    Response::from_json(&serde_json::json!({ "days": days }))
}

/// Advance a YYYY-MM-DD date string by one day (no external deps).
fn next_date(date: &str) -> String {
    // Parse
    let y: i32 = date[0..4].parse().unwrap_or(2026);
    let m: u32 = date[5..7].parse().unwrap_or(1);
    let d: u32 = date[8..10].parse().unwrap_or(1);
    // Days in month
    let days_in_month = match m {
        1|3|5|7|8|10|12 => 31,
        4|6|9|11 => 30,
        2 => if y % 400 == 0 || (y % 4 == 0 && y % 100 != 0) { 29 } else { 28 },
        _ => 30,
    };
    let (ny, nm, nd) = if d < days_in_month {
        (y, m, d + 1)
    } else if m < 12 {
        (y, m + 1, 1)
    } else {
        (y + 1, 1, 1)
    };
    format!("{:04}-{:02}-{:02}", ny, nm, nd)
}

/// GET /api/accommodation/config — dormitory layout (count, beds per dorm)
pub async fn get_accommodation_config(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    let dorms = db
        .prepare(
            "SELECT id, name, room_type, beds_count, active, notes FROM dormitories ORDER BY id",
        )
        .all()
        .await?;

    let total: i64 = dorms
        .results::<serde_json::Value>()?
        .iter()
        .filter(|d| d["active"].as_i64().unwrap_or(0) == 1)
        .map(|d| d["beds_count"].as_i64().unwrap_or(0))
        .sum();

    // Re-query for the response (consumed above)
    let dorms2 = db
        .prepare(
            "SELECT id, name, room_type, beds_count, active, notes FROM dormitories ORDER BY id",
        )
        .all()
        .await?;

    Response::from_json(&serde_json::json!({
        "dormitories":  dorms2.results::<serde_json::Value>()?,
        "total_beds":   total,
        "active_dorms": dorms2.results::<serde_json::Value>()?.iter()
            .filter(|d| d["active"].as_i64().unwrap_or(0) == 1)
            .count()
    }))
}
