#[cfg(test)]
mod worker_tests {
    #[test]
    fn test_notification_payload_parsing() {
        let notification_data = serde_json::json!({
            "type": "booking_confirmation",
            "channel": "email",
            "recipient": "test@example.com",
            "template_data": {
                "pilgrim_name": "Test Pilgrim",
                "booking_id": "12345"
            }
        });

        let serialized = notification_data.to_string();
        let parsed: serde_json::Value = serde_json::from_str(&serialized).unwrap();
        assert_eq!(parsed["recipient"], "test@example.com");
        assert_eq!(parsed["channel"], "email");
    }

    #[test]
    fn test_notification_status_path() {
        let path = "/notifications/status/12345";
        assert!(path.contains("/notifications/status/"));
    }
}
