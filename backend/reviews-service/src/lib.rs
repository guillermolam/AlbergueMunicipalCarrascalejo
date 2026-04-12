#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::must_use_candidate,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::unused_async,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss,
    clippy::future_not_send
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use worker::{
    event, Context, Env, Method, Request, Response, Result, ScheduleContext, ScheduledEvent,
};

// ── Domain types ─────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Review {
    pub id: String,
    pub author_name: String,
    pub rating: f32,
    pub text: String,
    pub date: String,
    pub source: String,
    pub verified: bool,
    pub helpful_count: u32,
    pub language: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ReviewsResponse {
    pub reviews: Vec<Review>,
    pub total_count: u32,
    pub average_rating: f32,
    pub source_breakdown: HashMap<String, u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReviewScores {
    pub source: String,
    pub overall: Option<f32>,
    pub staff: Option<f32>,
    pub cleanliness: Option<f32>,
    pub comfort: Option<f32>,
    pub value_for_money: Option<f32>,
    pub facilities: Option<f32>,
    pub location: Option<f32>,
    pub total_count: u32,
    pub label: Option<String>,
    pub last_synced: String,
}

#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

// ── D1 row types (for raw query deserialization) ─────────────────────────────

#[derive(Deserialize, Debug)]
struct ReviewRow {
    id: String,
    source: String,
    author_name: Option<String>,
    rating: f64,
    text: Option<String>,
    review_date: Option<String>,
    language: Option<String>,
    verified: i32,
    helpful_count: i32,
}

#[derive(Deserialize, Debug)]
struct ScoresRow {
    source: String,
    overall: Option<f64>,
    staff: Option<f64>,
    cleanliness: Option<f64>,
    comfort: Option<f64>,
    value_for_money: Option<f64>,
    facilities: Option<f64>,
    location: Option<f64>,
    total_count: i32,
    label: Option<String>,
    last_synced: String,
}

// ── Entry points ─────────────────────────────────────────────────────────────

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let path = req.path();

    if req.method() == Method::Options {
        return cors_ok();
    }

    let mut response = match (req.method(), path.as_str()) {
        (Method::Get, "/reviews/google") => handle_source_reviews(&env, "google").await?,
        (Method::Get, "/reviews/booking") => handle_source_reviews(&env, "booking").await?,
        (Method::Get, "/reviews/all") => handle_all_reviews(&env).await?,
        (Method::Get, "/reviews/stats") => handle_stats(&env, "all").await?,
        (Method::Get, p) if p.starts_with("/reviews/stats/") => {
            let source = p.trim_start_matches("/reviews/stats/");
            handle_stats(&env, source).await?
        }
        (Method::Post, "/reviews/sync") => handle_sync(&env).await?,
        _ => not_found("Reviews endpoint not found"),
    };

    add_cors_headers(&mut response)?;
    Ok(response)
}

/// Scheduled cron: sync reviews from Google Places and Booking.com every 6 hours.
#[event(scheduled)]
async fn scheduled(_event: ScheduledEvent, env: Env, _ctx: ScheduleContext) {
    if let Err(e) = sync_reviews(&env).await {
        tracing::error!("Scheduled review sync failed: {:?}", e);
    }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async fn handle_source_reviews(env: &Env, source: &str) -> Result<Response> {
    let reviews = load_reviews_from_db(env, Some(source))
        .await
        .unwrap_or_default();

    let response = ReviewsResponse {
        total_count: reviews.len() as u32,
        average_rating: average_rating(&reviews),
        source_breakdown: source_breakdown(&reviews),
        reviews,
    };
    json_response(200, &response)
}

async fn handle_all_reviews(env: &Env) -> Result<Response> {
    let mut reviews = load_reviews_from_db(env, None).await.unwrap_or_default();
    reviews.sort_by(|a, b| b.date.cmp(&a.date));

    let response = ReviewsResponse {
        total_count: reviews.len() as u32,
        average_rating: average_rating(&reviews),
        source_breakdown: source_breakdown(&reviews),
        reviews,
    };
    json_response(200, &response)
}

async fn handle_stats(env: &Env, source: &str) -> Result<Response> {
    if let Ok(Some(s)) = load_scores_from_db(env, source).await {
        return json_response(200, &s);
    }
    // Return empty placeholder — frontend falls back to its own default
    let empty = ReviewScores {
        source: source.to_string(),
        overall: None,
        staff: None,
        cleanliness: None,
        comfort: None,
        value_for_money: None,
        facilities: None,
        location: None,
        total_count: 0,
        label: None,
        last_synced: chrono::Utc::now().to_rfc3339(),
    };
    json_response(200, &empty)
}

async fn handle_sync(env: &Env) -> Result<Response> {
    match sync_reviews(env).await {
        Ok(()) => json_response(
            200,
            &serde_json::json!({"ok": true, "synced_at": chrono::Utc::now().to_rfc3339()}),
        ),
        Err(e) => json_response(
            500,
            &serde_json::json!({"ok": false, "error": e.to_string()}),
        ),
    }
}

// ── D1 helpers ────────────────────────────────────────────────────────────────

async fn load_reviews_from_db(env: &Env, source: Option<&str>) -> Result<Vec<Review>> {
    let d1 = env.d1("DB")?;
    let (sql, bind_source) = source.map_or(
        ("SELECT id, source, author_name, rating, text, review_date, language, verified, helpful_count FROM reviews ORDER BY review_date DESC", None),
        |src| ("SELECT id, source, author_name, rating, text, review_date, language, verified, helpful_count FROM reviews WHERE source = ? ORDER BY review_date DESC", Some(src)),
    );

    let stmt = d1.prepare(sql);
    let stmt = if let Some(src) = bind_source {
        stmt.bind(&[src.into()])?
    } else {
        stmt
    };

    let result = stmt.all().await?;
    let rows = result.results::<ReviewRow>().unwrap_or_default();
    let reviews = rows
        .into_iter()
        .map(|r| Review {
            id: r.id,
            author_name: r.author_name.unwrap_or_default(),
            rating: r.rating as f32,
            text: r.text.unwrap_or_default(),
            date: r.review_date.unwrap_or_default(),
            source: r.source,
            verified: r.verified != 0,
            helpful_count: r.helpful_count.cast_unsigned(),
            language: r.language,
        })
        .collect();
    Ok(reviews)
}

async fn load_scores_from_db(env: &Env, source: &str) -> Result<Option<ReviewScores>> {
    let d1 = env.d1("DB")?;
    let result = d1
        .prepare("SELECT source, overall, staff, cleanliness, comfort, value_for_money, facilities, location, total_count, label, last_synced FROM review_scores WHERE source = ?")
        .bind(&[source.into()])?
        .first::<ScoresRow>(None)
        .await?;

    Ok(result.map(|r| ReviewScores {
        source: r.source,
        overall: r.overall.map(|v| v as f32),
        staff: r.staff.map(|v| v as f32),
        cleanliness: r.cleanliness.map(|v| v as f32),
        comfort: r.comfort.map(|v| v as f32),
        value_for_money: r.value_for_money.map(|v| v as f32),
        facilities: r.facilities.map(|v| v as f32),
        location: r.location.map(|v| v as f32),
        total_count: r.total_count.cast_unsigned(),
        label: r.label,
        last_synced: r.last_synced,
    }))
}

// ── External sync ────────────────────────────────────────────────────────────

/// Sync reviews from Google Places API and update aggregated scores.
/// Booking.com scores are updated via an admin POST to /reviews/sync with a body,
/// or seeded once via the migration file.
async fn sync_reviews(env: &Env) -> Result<()> {
    sync_google_reviews(env).await?;
    update_aggregated_scores(env).await?;
    Ok(())
}

async fn sync_google_reviews(env: &Env) -> Result<()> {
    #[derive(Deserialize)]
    struct PlacesReview {
        author_name: String,
        rating: u8,
        text: String,
        time: i64,
        language: Option<String>,
    }
    #[derive(Deserialize)]
    struct PlacesResult {
        reviews: Option<Vec<PlacesReview>>,
        rating: Option<f64>,
        user_ratings_total: Option<u32>,
    }
    #[derive(Deserialize)]
    struct PlacesResponse {
        result: Option<PlacesResult>,
    }

    let api_key = if let Ok(k) = env.var("GOOGLE_PLACES_API_KEY") {
        k.to_string()
    } else {
        tracing::warn!("GOOGLE_PLACES_API_KEY not set — skipping Google sync");
        return Ok(());
    };
    let place_id = env.var("GOOGLE_PLACE_ID").map_or_else(
        |_| "ChIJN0rEpz9bQQ0RnAVmpZ5XLUE".to_string(),
        |v| v.to_string(),
    ); // El Carrascalejo placeholder

    let url = format!(
        "https://maps.googleapis.com/maps/api/place/details/json?place_id={place_id}&fields=reviews,rating,user_ratings_total&key={api_key}&language=es"
    );

    let mut resp = worker::Fetch::Url(
        url.parse()
            .map_err(|e: url::ParseError| worker::Error::RustError(e.to_string()))?,
    )
    .send()
    .await?;

    if resp.status_code() != 200 {
        tracing::warn!("Google Places API returned {}", resp.status_code());
        return Ok(());
    }

    let body: PlacesResponse = resp.json().await.unwrap_or(PlacesResponse { result: None });
    let Some(result) = body.result else {
        return Ok(());
    };

    let d1 = env.d1("DB")?;
    let now = chrono::Utc::now().to_rfc3339();

    if let Some(google_reviews) = result.reviews {
        for r in google_reviews {
            let id = format!("google_{}", r.time);
            let date = chrono::DateTime::<chrono::Utc>::from_timestamp(r.time, 0)
                .map(|dt| dt.format("%Y-%m-%d").to_string())
                .unwrap_or_default();
            d1.prepare(
                "INSERT OR REPLACE INTO reviews (id, source, author_name, rating, text, review_date, language, verified, helpful_count, synced_at) VALUES (?, 'google', ?, ?, ?, ?, ?, 1, 0, ?)"
            )
            .bind(&[id.into(), r.author_name.into(), (f64::from(r.rating)).into(), r.text.into(), date.into(), r.language.unwrap_or_default().into(), now.clone().into()])?
            .run()
            .await?;
        }
    }

    // Update google scores row
    if let (Some(rating), Some(count)) = (result.rating, result.user_ratings_total) {
        d1.prepare(
            "INSERT OR REPLACE INTO review_scores (source, overall, total_count, last_synced) VALUES ('google', ?, ?, ?)"
        )
        .bind(&[rating.into(), i64::from(count).into(), now.into()])?
        .run()
        .await?;
    }

    Ok(())
}

/// Recompute the 'all' aggregated row from google + booking rows.
async fn update_aggregated_scores(env: &Env) -> Result<()> {
    let d1 = env.d1("DB")?;
    let now = chrono::Utc::now().to_rfc3339();
    // Simple: recompute weighted average of overall across sources
    d1.prepare(
        "INSERT OR REPLACE INTO review_scores (source, overall, staff, cleanliness, comfort, value_for_money, facilities, location, total_count, label, last_synced)
         SELECT 'all',
           ROUND(SUM(overall * total_count) / NULLIF(SUM(CASE WHEN overall IS NOT NULL THEN total_count ELSE 0 END), 0), 1),
           MAX(staff), MAX(cleanliness), MAX(comfort), MAX(value_for_money), MAX(facilities), MAX(location),
           SUM(total_count),
           CASE WHEN SUM(overall * total_count) / NULLIF(SUM(CASE WHEN overall IS NOT NULL THEN total_count ELSE 0 END), 0) >= 9.0 THEN 'Sobresaliente'
                WHEN SUM(overall * total_count) / NULLIF(SUM(CASE WHEN overall IS NOT NULL THEN total_count ELSE 0 END), 0) >= 8.0 THEN 'Muy bien'
                ELSE 'Bien' END,
           ?
         FROM review_scores WHERE source IN ('google', 'booking')"
    )
    .bind(&[now.into()])?
    .run()
    .await?;
    Ok(())
}

// ── Utilities ─────────────────────────────────────────────────────────────────

fn average_rating(reviews: &[Review]) -> f32 {
    if reviews.is_empty() {
        return 0.0;
    }
    let total: f32 = reviews.iter().map(|r| r.rating).sum();
    total / reviews.len() as f32
}

fn source_breakdown(reviews: &[Review]) -> HashMap<String, u32> {
    let mut breakdown = HashMap::new();
    for review in reviews {
        *breakdown.entry(review.source.clone()).or_insert(0) += 1;
    }
    breakdown
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Result<Response> {
    let json = serde_json::to_string(body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut response = Response::ok(json)?;
    response
        .headers_mut()
        .set("Content-Type", "application/json")?;
    Ok(response.with_status(status))
}

fn not_found(msg: &str) -> Response {
    let err = ErrorResponse {
        error: "Not Found".to_string(),
        message: msg.to_string(),
    };
    let json = serde_json::to_string(&err).unwrap_or_default();
    let mut resp = Response::ok(json).unwrap();
    resp.headers_mut()
        .set("Content-Type", "application/json")
        .unwrap();
    resp.with_status(404)
}

fn cors_ok() -> Result<Response> {
    let mut response = Response::ok("")?;
    add_cors_headers(&mut response)?;
    Ok(response)
}

fn add_cors_headers(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")?;
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    )?;
    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_review(id: &str, author: &str, rating: f32, source: &str) -> Review {
        Review {
            id: id.to_string(),
            author_name: author.to_string(),
            rating,
            text: "Test review text".to_string(),
            date: "2024-01-01".to_string(),
            source: source.to_string(),
            verified: true,
            helpful_count: 0,
            language: Some("es".to_string()),
        }
    }

    #[test]
    fn test_review_serialization_roundtrip() {
        let review = make_review("r1", "Alice", 5.0, "Google");
        let json = serde_json::to_string(&review).unwrap();
        let deserialized: Review = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "r1");
        assert_eq!(deserialized.author_name, "Alice");
        assert!((deserialized.rating - 5.0).abs() < f32::EPSILON);
        assert_eq!(deserialized.source, "Google");
        assert!(deserialized.verified);
    }

    #[test]
    fn test_average_rating_empty_list() {
        let reviews: Vec<Review> = vec![];
        assert!((average_rating(&reviews) - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_mixed() {
        let reviews = vec![
            make_review("r1", "A", 5.0, "Google"),
            make_review("r2", "B", 4.0, "Booking.com"),
            make_review("r3", "C", 3.0, "Google"),
        ];
        assert!((average_rating(&reviews) - 4.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_source_breakdown_multiple_sources() {
        let reviews = vec![
            make_review("r1", "A", 5.0, "Google"),
            make_review("r2", "B", 4.0, "Booking.com"),
            make_review("r3", "C", 3.0, "Google"),
        ];
        let breakdown = source_breakdown(&reviews);
        assert_eq!(breakdown["Google"], 2);
        assert_eq!(breakdown["Booking.com"], 1);
    }

    #[test]
    fn test_source_breakdown_empty() {
        let reviews: Vec<Review> = vec![];
        assert!(source_breakdown(&reviews).is_empty());
    }

    #[test]
    fn test_review_scores_serialization() {
        let scores = ReviewScores {
            source: "booking".to_string(),
            overall: Some(9.1),
            staff: Some(9.6),
            cleanliness: Some(9.4),
            comfort: Some(9.3),
            value_for_money: Some(9.6),
            facilities: Some(9.0),
            location: Some(9.0),
            total_count: 71,
            label: Some("Sobresaliente".to_string()),
            last_synced: "2026-04-12T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&scores).unwrap();
        assert!(json.contains("\"overall\":9.1"));
        assert!(json.contains("\"total_count\":71"));
        assert!(json.contains("Sobresaliente"));
    }
}
