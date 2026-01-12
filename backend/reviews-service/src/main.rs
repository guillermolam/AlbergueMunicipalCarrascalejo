#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone)]
pub struct Review {
    pub id: String,
    pub source: String,
    pub author: String,
    pub rating: f32,
    pub text: String,
    pub date: String,
    pub verified: bool,
    pub country: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct ReviewsResponse {
    pub success: bool,
    pub sources: Vec<String>,
    pub total: usize,
    pub average_rating: f32,
    pub reviews: Vec<Review>,
}

// Google Reviews API integration
pub async fn fetch_google_reviews() -> Result<Vec<Review>, String> {
    // In production, this would use Google My Business API
    // For now, returning structured sample data that matches real format
    let reviews = vec![
        Review {
            id: "google_1".to_string(),
            source: "Google".to_string(),
            author: "María García".to_string(),
            rating: 5.0,
            text: "Excelente albergue en el Camino de la Plata. Las instalaciones están muy limpias y el trato es excepcional. Muy recomendable para peregrinos.".to_string(),
            date: "2024-01-15".to_string(),
            verified: true,
            country: None,
        },
        Review {
            id: "google_2".to_string(),
            source: "Google".to_string(),
            author: "John Smith".to_string(),
            rating: 4.0,
            text: "Great hostel on the Silver Way. Clean facilities and friendly staff. Perfect location for pilgrims walking the Camino de la Plata.".to_string(),
            date: "2024-01-10".to_string(),
            verified: true,
            country: None,
        },
        Review {
            id: "google_3".to_string(),
            source: "Google".to_string(),
            author: "Carmen Rodríguez".to_string(),
            rating: 5.0,
            text: "Un lugar perfecto para descansar en el Camino. Habitaciones cómodas, cocina bien equipada y un ambiente muy acogedor.".to_string(),
            date: "2024-01-08".to_string(),
            verified: true,
            country: None,
        },
    ];

    Ok(reviews)
}

// Booking.com Reviews API integration
pub async fn fetch_booking_reviews() -> Result<Vec<Review>, String> {
    // In production, this would use Booking.com Partnership API
    // Returning structured sample data matching expected format
    let reviews = vec![
        Review {
            id: "booking_1".to_string(),
            source: "Booking.com".to_string(),
            author: "Anna K.".to_string(),
            rating: 9.2,
            text: "Fantastic place for pilgrims! Very clean, comfortable beds, and the owners are incredibly helpful. Highly recommended.".to_string(),
            date: "2024-01-12".to_string(),
            verified: true,
            country: Some("Germany".to_string()),
        },
        Review {
            id: "booking_2".to_string(),
            source: "Booking.com".to_string(),
            author: "Pedro M.".to_string(),
            rating: 8.8,
            text: "Albergue muy bien ubicado en el Camino de la Plata. Instalaciones modernas y personal muy amable.".to_string(),
            date: "2024-01-05".to_string(),
            verified: true,
            country: Some("Spain".to_string()),
        },
    ];

    Ok(reviews)
}

// Combine reviews from all sources
pub async fn fetch_all_reviews() -> Result<ReviewsResponse, String> {
    let google_reviews = fetch_google_reviews().await?;
    let booking_reviews = fetch_booking_reviews().await?;

    let mut all_reviews = Vec::new();
    all_reviews.extend(google_reviews);
    all_reviews.extend(booking_reviews);

    // Sort by date (newest first)
    all_reviews.sort_by(|a, b| b.date.cmp(&a.date));

    let total = all_reviews.len();
    let average_rating = if total > 0 {
        all_reviews.iter().map(|r| r.rating).sum::<f32>() / total as f32
    } else {
        0.0
    };

    // Return latest 6 reviews for homepage display
    let display_reviews: Vec<Review> = all_reviews.into_iter().take(6).collect();

    Ok(ReviewsResponse {
        success: true,
        sources: vec!["Google Reviews".to_string(), "Booking.com".to_string()],
        total,
        average_rating: (average_rating * 10.0).round() / 10.0,
        reviews: display_reviews,
    })
}

#[wasm_bindgen]
pub async fn handle_reviews_request(path: &str) -> String {
    match path {
        "/reviews/google" => match fetch_google_reviews().await {
            Ok(reviews) => {
                let response = ReviewsResponse {
                    success: true,
                    sources: vec!["Google Reviews".to_string()],
                    total: reviews.len(),
                    average_rating: 4.7,
                    reviews,
                };
                serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string())
            }
            Err(_) => {
                r#"{"success": false, "error": "Failed to fetch Google reviews"}"#.to_string()
            }
        },
        "/reviews/booking" => match fetch_booking_reviews().await {
            Ok(reviews) => {
                let response = ReviewsResponse {
                    success: true,
                    sources: vec!["Booking.com".to_string()],
                    total: reviews.len(),
                    average_rating: 9.0,
                    reviews,
                };
                serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string())
            }
            Err(_) => {
                r#"{"success": false, "error": "Failed to fetch Booking.com reviews"}"#.to_string()
            }
        },
        "/reviews/all" => match fetch_all_reviews().await {
            Ok(response) => serde_json::to_string(&response).unwrap_or_else(|_| "{}".to_string()),
            Err(_) => {
                r#"{"success": false, "error": "Failed to fetch combined reviews"}"#.to_string()
            }
        },
        _ => r#"{"success": false, "error": "Invalid reviews endpoint"}"#.to_string(),
    }
}
