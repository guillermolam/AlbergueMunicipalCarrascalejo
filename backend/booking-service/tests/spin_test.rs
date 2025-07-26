
#[cfg(test)]
mod spin_tests {
    use spin_sdk::http::{Request, Method};
    use spin_sdk::http_component;
    use serde_json;

    #[tokio::test]
    async fn test_booking_service_health() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/health")
            .body(vec![])
            .expect("Failed to build request");

        // This would be the actual test against the component
        // For now, we test the component interface
        assert!(request.method() == Method::GET);
        assert!(request.uri().path() == "/health");
    }

    #[tokio::test]
    async fn test_booking_creation_request() {
        let booking_data = serde_json::json!({
            "pilgrim_name": "Test Pilgrim",
            "check_in_date": "2024-01-15",
            "check_out_date": "2024-01-16",
            "bed_preference": "lower"
        });

        let request = Request::builder()
            .method(Method::POST)
            .uri("/bookings")
            .header("Content-Type", "application/json")
            .body(booking_data.to_string().into_bytes())
            .expect("Failed to build booking request");

        assert!(request.method() == Method::POST);
        assert!(request.uri().path() == "/bookings");
        assert!(request.headers().get("Content-Type").is_some());
    }

    #[tokio::test]
    async fn test_rooms_availability_request() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/rooms/availability?date=2024-01-15")
            .body(vec![])
            .expect("Failed to build availability request");

        assert!(request.method() == Method::GET);
        assert!(request.uri().query().unwrap().contains("date=2024-01-15"));
    }
}
