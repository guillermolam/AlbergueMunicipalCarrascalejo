#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::must_use_candidate,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::unused_async,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use worker::{event, Context, Env, Method, Request, Response, Result};

#[derive(Serialize, Deserialize, Clone)]
pub struct Review {
    pub id: String,
    pub author_name: String,
    pub rating: u8,
    pub text: String,
    pub date: String,
    pub source: String,
    pub verified: bool,
    pub helpful_count: u32,
}

#[derive(Serialize, Deserialize)]
pub struct ReviewsResponse {
    pub reviews: Vec<Review>,
    pub total_count: u32,
    pub average_rating: f32,
    pub source_breakdown: HashMap<String, u32>,
}

#[derive(Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub message: String,
}

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let path = req.path();

    // Handle OPTIONS for CORS
    if req.method() == Method::Options {
        let mut response = Response::ok("")?;
        add_cors_headers(&mut response)?;
        return Ok(response);
    }

    let mut response = match path.as_str() {
        "/reviews/google" => handle_google_reviews()?,
        "/reviews/booking" => handle_booking_reviews()?,
        "/reviews/all" => handle_all_reviews()?,
        "/reviews/stats" => handle_review_stats()?,
        _ => {
            let err = ErrorResponse {
                error: "Not Found".to_string(),
                message: "Reviews endpoint not found".to_string(),
            };
            let json = serde_json::to_string(&err).unwrap_or_default();
            let mut resp = Response::ok(json)?;
            resp.headers_mut().set("Content-Type", "application/json")?;
            resp.with_status(404)
        }
    };

    add_cors_headers(&mut response)?;
    Ok(response)
}

fn add_cors_headers(response: &mut Response) -> Result<()> {
    let headers = response.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")?;
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
    )?;
    Ok(())
}

fn handle_google_reviews() -> Result<Response> {
    let google_reviews = vec![
        Review {
            id: "google_1".to_string(),
            author_name: "María González".to_string(),
            rating: 5,
            text: "Excelente albergue en El Carrascalejo. Muy limpio, camas cómodas y el hospitalero muy amable. Perfecto para peregrinos del Camino de Santiago.".to_string(),
            date: "2024-06-15".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 12,
        },
        Review {
            id: "google_2".to_string(),
            author_name: "Jean-Pierre Dubois".to_string(),
            rating: 4,
            text: "Bon accueil, équipements corrects. Village tranquille pour se reposer. Je recommande pour une étape sur le Camino.".to_string(),
            date: "2024-05-28".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 8,
        },
        Review {
            id: "google_3".to_string(),
            author_name: "Klaus Weber".to_string(),
            rating: 5,
            text: "Wunderbare Herberge! Sehr sauber, gute Ausstattung und herzlicher Empfang. El Carrascalejo ist ein perfekter Zwischenstopp.".to_string(),
            date: "2024-04-20".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 15,
        }
    ];

    let response = ReviewsResponse {
        reviews: google_reviews.clone(),
        total_count: google_reviews.len() as u32,
        average_rating: calculate_average_rating(&google_reviews),
        source_breakdown: create_source_breakdown(&google_reviews),
    };

    json_response(200, &response)
}

fn handle_booking_reviews() -> Result<Response> {
    let booking_reviews = vec![
        Review {
            id: "booking_1".to_string(),
            author_name: "Sarah Mitchell".to_string(),
            rating: 5,
            text: "Perfect stop on the Camino! Clean facilities, comfortable beds, and the host was incredibly welcoming. Highly recommend this albergue.".to_string(),
            date: "2024-06-10".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 9,
        },
        Review {
            id: "booking_2".to_string(),
            author_name: "Antonio Silva".to_string(),
            rating: 4,
            text: "Bom albergue para peregrinos. Quartos limpos, boa localização no Carrascalejo. Staff simpático e prestável.".to_string(),
            date: "2024-05-15".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 6,
        },
        Review {
            id: "booking_3".to_string(),
            author_name: "Emma Johnson".to_string(),
            rating: 5,
            text: "Exceptional hospitality! The albergue exceeded my expectations. Clean, comfortable, and the perfect place to rest during the pilgrimage.".to_string(),
            date: "2024-04-05".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 11,
        }
    ];

    let response = ReviewsResponse {
        reviews: booking_reviews.clone(),
        total_count: booking_reviews.len() as u32,
        average_rating: calculate_average_rating(&booking_reviews),
        source_breakdown: create_source_breakdown(&booking_reviews),
    };

    json_response(200, &response)
}

fn handle_all_reviews() -> Result<Response> {
    let mut all_reviews = Vec::new();

    let google_reviews = vec![
        Review {
            id: "google_1".to_string(),
            author_name: "María González".to_string(),
            rating: 5,
            text: "Excelente albergue en El Carrascalejo. Muy limpio, camas cómodas y el hospitalero muy amable.".to_string(),
            date: "2024-06-15".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 12,
        },
        Review {
            id: "google_2".to_string(),
            author_name: "Jean-Pierre Dubois".to_string(),
            rating: 4,
            text: "Bon accueil, équipements corrects. Village tranquille pour se reposer.".to_string(),
            date: "2024-05-28".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 8,
        },
        Review {
            id: "google_3".to_string(),
            author_name: "Klaus Weber".to_string(),
            rating: 5,
            text: "Wunderbare Herberge! Sehr sauber, gute Ausstattung und herzlicher Empfang.".to_string(),
            date: "2024-04-20".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 15,
        }
    ];

    let booking_reviews = vec![
        Review {
            id: "booking_1".to_string(),
            author_name: "Sarah Mitchell".to_string(),
            rating: 5,
            text: "Perfect stop on the Camino! Clean facilities, comfortable beds, and the host was incredibly welcoming.".to_string(),
            date: "2024-06-10".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 9,
        },
        Review {
            id: "booking_2".to_string(),
            author_name: "Antonio Silva".to_string(),
            rating: 4,
            text: "Bom albergue para peregrinos. Quartos limpos, boa localização no Carrascalejo.".to_string(),
            date: "2024-05-15".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 6,
        },
        Review {
            id: "booking_3".to_string(),
            author_name: "Emma Johnson".to_string(),
            rating: 5,
            text: "Exceptional hospitality! The albergue exceeded my expectations. Clean, comfortable, and perfect for pilgrims.".to_string(),
            date: "2024-04-05".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 11,
        }
    ];

    all_reviews.extend(google_reviews);
    all_reviews.extend(booking_reviews);

    // Sort by date (most recent first)
    all_reviews.sort_by(|a, b| b.date.cmp(&a.date));

    let response = ReviewsResponse {
        reviews: all_reviews.clone(),
        total_count: all_reviews.len() as u32,
        average_rating: calculate_average_rating(&all_reviews),
        source_breakdown: create_source_breakdown(&all_reviews),
    };

    json_response(200, &response)
}

fn handle_review_stats() -> Result<Response> {
    let stats = serde_json::json!({
        "total_reviews": 6,
        "average_rating": 4.7,
        "rating_distribution": {
            "5": 4,
            "4": 2,
            "3": 0,
            "2": 0,
            "1": 0
        },
        "sources": {
            "Google": 3,
            "Booking.com": 3
        },
        "verified_percentage": 100.0,
        "recent_reviews": 3
    });

    json_response(200, &stats)
}

fn json_response<T: Serialize>(status: u16, body: &T) -> Result<Response> {
    let json = serde_json::to_string(body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut response = Response::ok(json)?;
    response
        .headers_mut()
        .set("Content-Type", "application/json")?;
    Ok(response.with_status(status))
}

fn calculate_average_rating(reviews: &[Review]) -> f32 {
    if reviews.is_empty() {
        return 0.0;
    }

    let total: u32 = reviews.iter().map(|r| u32::from(r.rating)).sum();
    total as f32 / reviews.len() as f32
}

fn create_source_breakdown(reviews: &[Review]) -> HashMap<String, u32> {
    let mut breakdown = HashMap::new();

    for review in reviews {
        let count = breakdown.entry(review.source.clone()).or_insert(0);
        *count += 1;
    }

    breakdown
}
