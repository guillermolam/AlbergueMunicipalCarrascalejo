// If `reviews_service` is a local crate in the workspace, use this:
// use crate::{ErrorResponse, Review, ReviewsResponse};
// Or, if `reviews_service` is in the parent directory as a library crate:
use reviews_service::{ErrorResponse, Review, ReviewsResponse};
use std::collections::HashMap;

#[test]
fn test_review_struct() {
    let review = Review {
        id: "test_1".to_string(),
        author_name: "Test Author".to_string(),
        rating: 5,
        text: "Great service!".to_string(),
        date: "2024-01-01".to_string(),
        source: "Google".to_string(),
        verified: true,
        helpful_count: 10,
    };

    assert_eq!(review.id, "test_1");
    assert_eq!(review.author_name, "Test Author");
    assert_eq!(review.rating, 5);
    assert_eq!(review.source, "Google");
    assert!(review.verified);
}

#[test]
fn test_review_serialization() {
    let review = Review {
        id: "test_1".to_string(),
        author_name: "Test Author".to_string(),
        rating: 5,
        text: "Excellent!".to_string(),
        date: "2024-01-01".to_string(),
        source: "Booking".to_string(),
        verified: true,
        helpful_count: 5,
    };

    let json = serde_json::to_string(&review).unwrap();
    let deserialized: Review = serde_json::from_str(&json).unwrap();

    assert_eq!(review.id, deserialized.id);
    assert_eq!(review.author_name, deserialized.author_name);
    assert_eq!(review.rating, deserialized.rating);
}

#[test]
fn test_reviews_response_structure() {
    let reviews = vec![
        Review {
            id: "1".to_string(),
            author_name: "Author1".to_string(),
            rating: 5,
            text: "Great!".to_string(),
            date: "2024-01-01".to_string(),
            source: "Google".to_string(),
            verified: true,
            helpful_count: 10,
        },
        Review {
            id: "2".to_string(),
            author_name: "Author2".to_string(),
            rating: 4,
            text: "Good!".to_string(),
            date: "2024-01-02".to_string(),
            source: "Booking".to_string(),
            verified: true,
            helpful_count: 5,
        },
    ];

    let response = ReviewsResponse {
        reviews: reviews.clone(),
        total_count: 2,
        average_rating: 4.5,
        source_breakdown: {
            let mut map = HashMap::new();
            map.insert("Google".to_string(), 1);
            map.insert("Booking".to_string(), 1);
            map
        },
    };

    assert_eq!(response.total_count, 2);
    assert_eq!(response.average_rating, 4.5);
    assert_eq!(response.reviews.len(), 2);
    assert_eq!(response.source_breakdown.len(), 2);
}

#[test]
fn test_error_response_structure() {
    let error = ErrorResponse {
        error: "Not Found".to_string(),
        message: "Reviews endpoint not found".to_string(),
    };

    assert_eq!(error.error, "Not Found");
    assert_eq!(error.message, "Reviews endpoint not found");
}

#[test]
fn test_reviews_response_serialization() {
    let reviews = vec![Review {
        id: "test_1".to_string(),
        author_name: "Test Author".to_string(),
        rating: 5,
        text: "Excellent!".to_string(),
        date: "2024-01-01".to_string(),
        source: "Google".to_string(),
        verified: true,
        helpful_count: 20,
    }];

    let response = ReviewsResponse {
        reviews,
        total_count: 1,
        average_rating: 5.0,
        source_breakdown: {
            let mut map = HashMap::new();
            map.insert("Google".to_string(), 1);
            map
        },
    };

    let json = serde_json::to_string(&response).unwrap();
    let deserialized: ReviewsResponse = serde_json::from_str(&json).unwrap();

    assert_eq!(response.total_count, deserialized.total_count);
    assert_eq!(response.average_rating, deserialized.average_rating);
    assert_eq!(response.reviews.len(), deserialized.reviews.len());
}
