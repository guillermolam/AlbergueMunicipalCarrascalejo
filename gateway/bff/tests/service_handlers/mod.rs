
use anyhow::Result;
use spin_sdk::http::{Request, Method};

#[cfg(test)]
mod tests {
    use super::*;
    use crate::gateway::bff::*;
    use crate::integration::{create_test_request, create_test_request_with_body};
    
    #[tokio::test]
    async fn test_auth_service_handler() -> Result<()> {
        let test_cases = vec![
            ("/api/auth/login", Method::POST),
            ("/api/auth/logout", Method::POST),
            ("/api/auth/callback", Method::GET),
            ("/api/auth/verify", Method::POST),
        ];
        
        for (path, method) in test_cases {
            let req = create_test_request(method, path, vec![
                ("Authorization", "Bearer test-token")
            ]);
            let response = handle_request(req).await?;
            
            // Should handle without crashing (may return auth errors)
            assert!(response.status() >= 200 && response.status() < 500);
        }
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_booking_service_handler() -> Result<()> {
        let booking_data = r#"{
            "guest_name": "Test User",
            "check_in": "2024-01-15",
            "check_out": "2024-01-17",
            "bed_type": "shared",
            "special_requests": "quiet room"
        }"#;
        
        let req = create_test_request_with_body(Method::POST, "/api/booking/create", booking_data);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        // Test admin stats endpoint
        let admin_req = create_test_request(Method::GET, "/api/booking/admin/stats", vec![
            ("Authorization", "Bearer admin-token")
        ]);
        let admin_response = handle_request(admin_req).await?;
        
        assert!(admin_response.status() >= 200 && admin_response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_reviews_service_handler() -> Result<()> {
        let req = create_test_request(Method::GET, "/api/reviews/list", vec![]);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        // Test creating a review
        let review_data = r#"{
            "author_name": "Happy Guest",
            "rating": 5,
            "text": "Great place to stay!",
            "source": "direct"
        }"#;
        
        let create_req = create_test_request_with_body(Method::POST, "/api/reviews/create", review_data);
        let create_response = handle_request(create_req).await?;
        
        assert!(create_response.status() >= 200 && create_response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_security_service_handler() -> Result<()> {
        let security_data = r#"{
            "request_ip": "192.168.1.1",
            "user_agent": "Mozilla/5.0",
            "path": "/api/booking/create"
        }"#;
        
        let req = create_test_request_with_body(Method::POST, "/api/security/check", security_data);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_rate_limiter_service_handler() -> Result<()> {
        let rate_limit_data = r#"{
            "client_id": "test-client",
            "endpoint": "/api/booking/create",
            "requests_per_minute": 10
        }"#;
        
        let req = create_test_request_with_body(Method::POST, "/api/rate-limit/check", rate_limit_data);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_notification_service_handler() -> Result<()> {
        let notification_data = r#"{
            "type": "email",
            "recipient": "test@example.com",
            "subject": "Booking Confirmation",
            "message": "Your booking has been confirmed."
        }"#;
        
        let req = create_test_request_with_body(Method::POST, "/api/notifications/send", notification_data);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_location_service_handler() -> Result<()> {
        let req = create_test_request(Method::GET, "/api/location/nearby", vec![]);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_info_service_handler() -> Result<()> {
        let req = create_test_request(Method::GET, "/api/info/arrival", vec![]);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
    
    #[tokio::test]
    async fn test_validation_service_handler() -> Result<()> {
        let validation_data = r#"{
            "document_type": "dni",
            "document_number": "12345678A",
            "image_data": "base64encodedimage"
        }"#;
        
        let req = create_test_request_with_body(Method::POST, "/api/validation/dni", validation_data);
        let response = handle_request(req).await?;
        
        assert!(response.status() >= 200 && response.status() < 500);
        
        Ok(())
    }
}
