use super::handle_request;
use super::ErrorResponse;
use super::Review;
use super::ReviewsResponse;
use http::{header::HeaderName, StatusCode};
use serde_json::json;
use spin_sdk::http::Request;
use std::collections::HashMap;

#[tokio::test]
async fn test_google_reviews_endpoint() {
    let req = Request::builder()
        .uri("/reviews/google")
        .method("GET")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let body = response.into_body().unwrap();
    let json_body: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(json_body.get("reviews").is_some());
    assert_eq!(json_body.get("total_count").unwrap().as_u64().unwrap(), 3);
    assert_eq!(
        json_body.get("average_rating").unwrap().as_f64().unwrap(),
        4.666666666666667
    );
    let source_breakdown = json_body
        .get("source_breakdown")
        .unwrap()
        .as_object()
        .unwrap();
    assert_eq!(source_breakdown.len(), 1);
    assert_eq!(source_breakdown.get("Google").unwrap().as_u64().unwrap(), 3);
}

#[tokio::test]
async fn test_booking_reviews_endpoint() {
    let req = Request::builder()
        .uri("/reviews/booking")
        .method("GET")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let body = response.into_body().unwrap();
    let json_body: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(json_body.get("reviews").is_some());
    assert_eq!(json_body.get("total_count").unwrap().as_u64().unwrap(), 3);
    assert_eq!(
        json_body.get("average_rating").unwrap().as_f64().unwrap(),
        4.666666666666667
    );
    let source_breakdown = json_body
        .get("source_breakdown")
        .unwrap()
        .as_object()
        .unwrap();
    assert_eq!(source_breakdown.len(), 1);
    assert_eq!(
        source_breakdown
            .get("Booking.com")
            .unwrap()
            .as_u64()
            .unwrap(),
        3
    );
}

#[tokio::test]
async fn test_all_reviews_endpoint() {
    let req = Request::builder()
        .uri("/reviews/all")
        .method("GET")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let body = response.into_body().unwrap();
    let json_body: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(json_body.get("reviews").is_some());
    assert_eq!(json_body.get("total_count").unwrap().as_u64().unwrap(), 6);
    assert_eq!(
        json_body.get("average_rating").unwrap().as_f64().unwrap(),
        4.666666666666667
    );
    let source_breakdown = json_body
        .get("source_breakdown")
        .unwrap()
        .as_object()
        .unwrap();
    assert_eq!(source_breakdown.len(), 2);
    assert_eq!(source_breakdown.get("Google").unwrap().as_u64().unwrap(), 3);
    assert_eq!(
        source_breakdown
            .get("Booking.com")
            .unwrap()
            .as_u64()
            .unwrap(),
        3
    );
}

#[tokio::test]
async fn test_review_stats_endpoint() {
    let req = Request::builder()
        .uri("/reviews/stats")
        .method("GET")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let body = response.into_body().unwrap();
    let json_body: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(json_body.get("total_count").is_some());
    assert!(json_body.get("average_rating").is_some());
    assert!(json_body.get("source_breakdown").is_some());

    let source_breakdown = json_body
        .get("source_breakdown")
        .unwrap()
        .as_object()
        .unwrap();
    assert_eq!(source_breakdown.len(), 2);
    assert_eq!(source_breakdown.get("Google").unwrap().as_u64().unwrap(), 3);
    assert_eq!(
        source_breakdown
            .get("Booking.com")
            .unwrap()
            .as_u64()
            .unwrap(),
        3
    );
}

#[tokio::test]
async fn test_invalid_endpoint() {
    let req = Request::builder()
        .uri("/reviews/invalid")
        .method("GET")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let body = response.into_body().unwrap();
    let json_body: serde_json::Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert!(json_body.get("error").is_some());
    assert!(json_body.get("message").is_some());
    assert_eq!(
        json_body.get("error").unwrap().as_str().unwrap(),
        "Not Found"
    );
    assert_eq!(
        json_body.get("message").unwrap().as_str().unwrap(),
        "Reviews endpoint not found"
    );
}

#[tokio::test]
async fn test_options_request() {
    let req = Request::builder()
        .uri("/reviews/google")
        .method("OPTIONS")
        .body(None)
        .unwrap();

    let response = handle_request(req).await.unwrap();
    let status = response.status();
    let headers = response.headers().clone();

    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
    assert_eq!(
        headers.get("Access-Control-Allow-Methods").unwrap(),
        "GET, OPTIONS"
    );
    assert_eq!(
        headers.get("Access-Control-Allow-Headers").unwrap(),
        "Content-Type, Authorization"
    );
}
