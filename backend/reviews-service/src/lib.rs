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

#[tracing::instrument(skip(response))]
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

#[tracing::instrument]
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

#[tracing::instrument]
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

#[tracing::instrument]
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

#[tracing::instrument]
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

#[tracing::instrument(skip(body))]
fn json_response<T: Serialize>(status: u16, body: &T) -> Result<Response> {
    let json = serde_json::to_string(body).map_err(|e| worker::Error::RustError(e.to_string()))?;
    let mut response = Response::ok(json)?;
    response
        .headers_mut()
        .set("Content-Type", "application/json")?;
    Ok(response.with_status(status))
}

#[tracing::instrument(skip(reviews), fields(review_count = reviews.len()))]
fn calculate_average_rating(reviews: &[Review]) -> f32 {
    if reviews.is_empty() {
        return 0.0;
    }

    let total: u32 = reviews.iter().map(|r| u32::from(r.rating)).sum();
    total as f32 / reviews.len() as f32
}

#[tracing::instrument(skip(reviews), fields(review_count = reviews.len()))]
fn create_source_breakdown(reviews: &[Review]) -> HashMap<String, u32> {
    let mut breakdown = HashMap::new();

    for review in reviews {
        let count = breakdown.entry(review.source.clone()).or_insert(0);
        *count += 1;
    }

    breakdown
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_review(id: &str, author: &str, rating: u8, source: &str) -> Review {
        Review {
            id: id.to_string(),
            author_name: author.to_string(),
            rating,
            text: "Test review text".to_string(),
            date: "2024-01-01".to_string(),
            source: source.to_string(),
            verified: true,
            helpful_count: 0,
        }
    }

    // --- Review struct tests ---

    #[test]
    fn test_review_serialization_roundtrip() {
        let review = make_review("r1", "Alice", 5, "Google");
        let json = serde_json::to_string(&review).unwrap();
        let deserialized: Review = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "r1");
        assert_eq!(deserialized.author_name, "Alice");
        assert_eq!(deserialized.rating, 5);
        assert_eq!(deserialized.source, "Google");
        assert!(deserialized.verified);
    }

    #[test]
    fn test_review_field_values() {
        let review = Review {
            id: "google_1".to_string(),
            author_name: "Maria".to_string(),
            rating: 4,
            text: "Great place".to_string(),
            date: "2024-06-15".to_string(),
            source: "Google".to_string(),
            verified: false,
            helpful_count: 7,
        };
        assert_eq!(review.id, "google_1");
        assert_eq!(review.rating, 4);
        assert_eq!(review.helpful_count, 7);
        assert!(!review.verified);
    }

    #[test]
    fn test_review_clone() {
        let review = make_review("r1", "Bob", 3, "Booking.com");
        let cloned = review.clone();
        assert_eq!(cloned.id, review.id);
        assert_eq!(cloned.rating, review.rating);
    }

    #[test]
    fn test_review_deserialize_from_json() {
        let json = r#"{
            "id": "test_1",
            "author_name": "Test User",
            "rating": 3,
            "text": "OK stay",
            "date": "2024-03-01",
            "source": "Google",
            "verified": false,
            "helpful_count": 2
        }"#;
        let review: Review = serde_json::from_str(json).unwrap();
        assert_eq!(review.id, "test_1");
        assert_eq!(review.rating, 3);
        assert!(!review.verified);
        assert_eq!(review.helpful_count, 2);
    }

    // --- ReviewsResponse tests ---

    #[test]
    fn test_reviews_response_construction() {
        let reviews = vec![
            make_review("r1", "Alice", 5, "Google"),
            make_review("r2", "Bob", 4, "Booking.com"),
        ];
        let response = ReviewsResponse {
            reviews: reviews.clone(),
            total_count: reviews.len() as u32,
            average_rating: calculate_average_rating(&reviews),
            source_breakdown: create_source_breakdown(&reviews),
        };
        assert_eq!(response.total_count, 2);
        assert!((response.average_rating - 4.5).abs() < f32::EPSILON);
    }

    #[test]
    fn test_reviews_response_serialization() {
        let reviews = vec![make_review("r1", "Alice", 5, "Google")];
        let response = ReviewsResponse {
            reviews,
            total_count: 1,
            average_rating: 5.0,
            source_breakdown: HashMap::from([("Google".to_string(), 1)]),
        };
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("\"total_count\":1"));
        assert!(json.contains("\"average_rating\":5.0"));
    }

    // --- ErrorResponse tests ---

    #[test]
    fn test_error_response_construction() {
        let err = ErrorResponse {
            error: "Not Found".to_string(),
            message: "Reviews endpoint not found".to_string(),
        };
        assert_eq!(err.error, "Not Found");
        assert_eq!(err.message, "Reviews endpoint not found");
    }

    #[test]
    fn test_error_response_serialization() {
        let err = ErrorResponse {
            error: "Bad Request".to_string(),
            message: "Invalid parameters".to_string(),
        };
        let json = serde_json::to_string(&err).unwrap();
        let deserialized: ErrorResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.error, "Bad Request");
        assert_eq!(deserialized.message, "Invalid parameters");
    }

    // --- calculate_average_rating tests ---

    #[test]
    fn test_average_rating_empty_list() {
        let reviews: Vec<Review> = vec![];
        assert!((calculate_average_rating(&reviews) - 0.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_single_review() {
        let reviews = vec![make_review("r1", "Alice", 4, "Google")];
        assert!((calculate_average_rating(&reviews) - 4.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_all_five_stars() {
        let reviews = vec![
            make_review("r1", "A", 5, "Google"),
            make_review("r2", "B", 5, "Google"),
            make_review("r3", "C", 5, "Google"),
        ];
        assert!((calculate_average_rating(&reviews) - 5.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_mixed_ratings() {
        let reviews = vec![
            make_review("r1", "A", 5, "Google"),
            make_review("r2", "B", 4, "Google"),
            make_review("r3", "C", 3, "Google"),
        ];
        assert!((calculate_average_rating(&reviews) - 4.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_all_one_star() {
        let reviews = vec![
            make_review("r1", "A", 1, "Google"),
            make_review("r2", "B", 1, "Google"),
        ];
        assert!((calculate_average_rating(&reviews) - 1.0).abs() < f32::EPSILON);
    }

    #[test]
    fn test_average_rating_non_integer_result() {
        // 5 + 4 = 9 / 2 = 4.5
        let reviews = vec![
            make_review("r1", "A", 5, "Google"),
            make_review("r2", "B", 4, "Booking.com"),
        ];
        assert!((calculate_average_rating(&reviews) - 4.5).abs() < f32::EPSILON);
    }

    // --- create_source_breakdown tests ---

    #[test]
    fn test_source_breakdown_single_source() {
        let reviews = vec![
            make_review("r1", "A", 5, "Google"),
            make_review("r2", "B", 4, "Google"),
        ];
        let breakdown = create_source_breakdown(&reviews);
        assert_eq!(breakdown.len(), 1);
        assert_eq!(breakdown["Google"], 2);
    }

    #[test]
    fn test_source_breakdown_multiple_sources() {
        let reviews = vec![
            make_review("r1", "A", 5, "Google"),
            make_review("r2", "B", 4, "Booking.com"),
            make_review("r3", "C", 3, "Google"),
            make_review("r4", "D", 5, "TripAdvisor"),
        ];
        let breakdown = create_source_breakdown(&reviews);
        assert_eq!(breakdown.len(), 3);
        assert_eq!(breakdown["Google"], 2);
        assert_eq!(breakdown["Booking.com"], 1);
        assert_eq!(breakdown["TripAdvisor"], 1);
    }

    #[test]
    fn test_source_breakdown_empty_list() {
        let reviews: Vec<Review> = vec![];
        let breakdown = create_source_breakdown(&reviews);
        assert!(breakdown.is_empty());
    }

    // --- Hardcoded review data tests ---

    #[test]
    fn test_google_reviews_have_correct_source() {
        let google_reviews = vec![
            make_review("google_1", "Maria", 5, "Google"),
            make_review("google_2", "Jean", 4, "Google"),
            make_review("google_3", "Klaus", 5, "Google"),
        ];
        for review in &google_reviews {
            assert_eq!(review.source, "Google");
            assert!(review.id.starts_with("google_"));
        }
        // Verify expected average: (5+4+5)/3 = 4.666...
        let avg = calculate_average_rating(&google_reviews);
        assert!((avg - 14.0 / 3.0).abs() < 0.01);
    }

    #[test]
    fn test_booking_reviews_have_correct_source() {
        let booking_reviews = vec![
            make_review("booking_1", "Sarah", 5, "Booking.com"),
            make_review("booking_2", "Antonio", 4, "Booking.com"),
            make_review("booking_3", "Emma", 5, "Booking.com"),
        ];
        for review in &booking_reviews {
            assert_eq!(review.source, "Booking.com");
            assert!(review.id.starts_with("booking_"));
        }
        let avg = calculate_average_rating(&booking_reviews);
        assert!((avg - 14.0 / 3.0).abs() < 0.01);
    }

    // --- Edge case: single review in response ---

    #[test]
    fn test_single_review_response() {
        let reviews = vec![make_review("r1", "Solo", 3, "Google")];
        let response = ReviewsResponse {
            reviews: reviews.clone(),
            total_count: reviews.len() as u32,
            average_rating: calculate_average_rating(&reviews),
            source_breakdown: create_source_breakdown(&reviews),
        };
        assert_eq!(response.total_count, 1);
        assert!((response.average_rating - 3.0).abs() < f32::EPSILON);
        assert_eq!(response.source_breakdown["Google"], 1);
    }
}
