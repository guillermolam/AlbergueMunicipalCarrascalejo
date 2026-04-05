use notification_service::application::notification_service::{
    create_booking_template, create_payment_template, create_reminder_template, NotificationService,
};
use notification_service::domain::notification::{
    Notification, NotificationChannel, NotificationStatus, NotificationType,
};

#[tokio::test]
async fn test_service_send_with_fallback_succeeds_on_email() {
    let service = NotificationService::new();
    let n = Notification::new(
        NotificationType::AdminAlert,
        NotificationChannel::Email,
        "admin@example.com".to_string(),
        "Test alert".to_string(),
    );
    let result = service
        .send_with_fallback(n, vec![NotificationChannel::Email])
        .await
        .unwrap();
    assert!(matches!(result.status, NotificationStatus::Sent));
}

#[tokio::test]
async fn test_service_send_with_fallback_fails_on_no_channels() {
    let service = NotificationService::new();
    let n = Notification::new(
        NotificationType::ReservationCreated,
        NotificationChannel::Email,
        "guest@example.com".to_string(),
        "Hello".to_string(),
    );
    let result = service.send_with_fallback(n, vec![]).await.unwrap();
    assert!(matches!(result.status, NotificationStatus::Failed));
}

#[tokio::test]
async fn test_service_send_bulk_processes_all() {
    let service = NotificationService::new();
    let notifications: Vec<Notification> = (0..5)
        .map(|i| {
            Notification::new(
                NotificationType::CheckInReminder,
                NotificationChannel::Email,
                format!("guest{i}@test.com"),
                format!("Reminder {i}"),
            )
        })
        .collect();
    let results = service.send_bulk(notifications).await.unwrap();
    assert_eq!(results.len(), 5);
    for r in &results {
        assert!(matches!(r.status, NotificationStatus::Sent));
    }
}

#[tokio::test]
async fn test_service_send_booking_confirmation_creates_email() {
    let service = NotificationService::new();
    let results = service
        .send_booking_confirmation("pilgrim@example.com", None, "Bed 3, Dormitory A")
        .await
        .unwrap();
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].recipient, "pilgrim@example.com");
    assert!(results[0].message.contains("Bed 3, Dormitory A"));
}

#[test]
fn test_booking_template_contains_all_fields() {
    let tmpl = create_booking_template("Ana", "BK-999", "2026-08-01", "2026-08-03");
    assert!(tmpl.contains("Ana"));
    assert!(tmpl.contains("BK-999"));
    assert!(tmpl.contains("2026-08-01"));
    assert!(tmpl.contains("2026-08-03"));
    assert!(tmpl.contains("Te esperamos"));
}

#[test]
fn test_payment_template_formats_correctly() {
    let tmpl = create_payment_template(2500, "tarjeta");
    assert!(tmpl.contains("25"));
    assert!(tmpl.contains("tarjeta"));
}

#[test]
fn test_reminder_template_includes_days() {
    let tmpl = create_reminder_template("Carlos", 7);
    assert!(tmpl.contains("Carlos"));
    assert!(tmpl.contains("7"));
}
