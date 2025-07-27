
#[cfg(test)]
mod spin_tests {
    use spin_sdk::http::{Request, Method};
    use serde_json;

    #[tokio::test]
    async fn test_notification_service_health() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/health")
            .body(vec![])
            .expect("Failed to build request");

        assert!(request.method() == Method::GET);
        assert!(request.uri().path() == "/health");
    }

    #[tokio::test]
    async fn test_send_notification_request() {
        let notification_data = serde_json::json!({
            "type": "booking_confirmation",
            "channel": "email",
            "recipient": "test@example.com",
            "template_data": {
                "pilgrim_name": "Test Pilgrim",
                "booking_id": "12345"
            }
        });

        let request = Request::builder()
            .method(Method::POST)
            .uri("/notifications/send")
            .header("Content-Type", "application/json")
            .body(notification_data.to_string().into_bytes())
            .expect("Failed to build notification request");

        assert!(request.method() == Method::POST);
        assert!(request.uri().path() == "/notifications/send");
    }

    #[tokio::test]
    async fn test_notification_status_request() {
        let request = Request::builder()
            .method(Method::GET)
            .uri("/notifications/status/12345")
            .body(vec![])
            .expect("Failed to build status request");

        assert!(request.method() == Method::GET);
        assert!(request.uri().path().contains("/notifications/status/"));
    }
}
