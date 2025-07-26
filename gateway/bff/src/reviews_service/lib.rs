
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use spin_sdk::http::{Request, Response};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct Review {
    id: String,
    author_name: String,
    rating: u8,
    text: String,
    date: String,
    source: String,
    verified: bool,
    helpful_count: u32,
}

#[derive(Serialize, Deserialize)]
struct ReviewsResponse {
    reviews: Vec<Review>,
    total_count: u32,
    average_rating: f32,
    source_breakdown: HashMap<String, u32>,
}

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    
    match path {
        "/api/reviews/all" => handle_all_reviews().await,
        "/api/reviews/stats" => handle_review_stats().await,
        _ => {
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .body(json!({"error": "Reviews endpoint not found"}).to_string())
                .build())
        }
    }
}

async fn handle_all_reviews() -> Result<Response> {
    let reviews = vec![
        Review {
            id: "1".to_string(),
            author_name: "María González".to_string(),
            rating: 5,
            text: "Excelente albergue! La hospitalidad de los hospitaleros es excepcional.".to_string(),
            date: "2024-03-15".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 12,
        },
        Review {
            id: "2".to_string(),
            author_name: "Jean-Pierre Martin".to_string(),
            rating: 4,
            text: "Très bon accueil et infrastructure moderne.".to_string(),
            date: "2024-03-12".to_string(),
            source: "Booking.com".to_string(),
            verified: true,
            helpful_count: 8,
        },
    ];

    let mut source_breakdown = HashMap::new();
    source_breakdown.insert("Google".to_string(), 28);
    source_breakdown.insert("Booking.com".to_string(), 19);

    let response = ReviewsResponse {
        reviews,
        total_count: 47,
        average_rating: 4.6,
        source_breakdown,
    };

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&response)?)
        .build())
}

async fn handle_review_stats() -> Result<Response> {
    let stats = json!({
        "total_reviews": 47,
        "average_rating": 4.6,
        "rating_distribution": {
            "5": 28,
            "4": 12,
            "3": 5,
            "2": 1,
            "1": 1
        }
    });

    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .body(stats.to_string())
        .build())
}
