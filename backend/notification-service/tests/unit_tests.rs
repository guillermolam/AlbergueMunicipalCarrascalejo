#[cfg(test)]
mod tests {
    use notification_service::domain::*;
    use uuid::Uuid;

    #[test]
    fn test_notification_creation() {
        let notification = Notification::new(
            NotificationType::ReservationCreated,
            NotificationChannel::Email,
            "test@example.com".to_string(),
            "Test message".to_string(),
        );

        assert_eq!(notification.notification_type, NotificationType::ReservationCreated);
        assert_eq!(notification.channel, NotificationChannel::Email);
        assert_eq!(notification.recipient, "test@example.com");
        assert_eq!(notification.message, "Test message");
        assert_eq!(notification.status, NotificationStatus::Pending);
    }

    #[test]
    fn test_notification_with_subject() {
        let notification = Notification::new(
            NotificationType::PaymentConfirmed,
            NotificationChannel::Email,
            "test@example.com".to_string(),
            "Payment received".to_string(),
        ).with_subject("Payment Confirmation".to_string());

        assert_eq!(notification.subject, Some("Payment Confirmation".to_string()));
    }

    #[test]
    fn test_notification_status_changes() {
        let mut notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::SMS,
            "+34666123456".to_string(),
            "Admin alert message".to_string(),
        );

        // Test marking as sent
        notification.mark_sent();
        assert_eq!(notification.status, NotificationStatus::Sent);
        assert!(notification.sent_at.is_some());

        // Test marking as delivered
        notification.mark_delivered();
        assert_eq!(notification.status, NotificationStatus::Delivered);
        assert!(notification.delivered_at.is_some());

        // Test marking as failed
        let mut failed_notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::SMS,
            "invalid".to_string(),
            "Test".to_string(),
        );
        
        failed_notification.mark_failed("Invalid phone number".to_string());
        assert_eq!(failed_notification.status, NotificationStatus::Failed);
        assert_eq!(failed_notification.error_message, Some("Invalid phone number".to_string()));
    }
}