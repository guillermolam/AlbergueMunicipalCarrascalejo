use notification_service::domain::notification::{
    BookingNotificationData, Notification, NotificationChannel, NotificationStatus,
    NotificationTemplate, NotificationType, PaymentNotificationData,
};
use std::collections::HashMap;

#[test]
fn test_notification_new_defaults_to_pending() {
    let n = Notification::new(
        NotificationType::ReservationCreated,
        NotificationChannel::Email,
        "test@example.com".to_string(),
        "Welcome".to_string(),
    );
    assert!(matches!(n.status, NotificationStatus::Pending));
    assert!(n.subject.is_none());
    assert!(n.sent_at.is_none());
    assert!(n.delivered_at.is_none());
    assert!(n.error_message.is_none());
}

#[test]
fn test_notification_with_subject_builder() {
    let n = Notification::new(
        NotificationType::AdminAlert,
        NotificationChannel::Email,
        "admin@test.com".to_string(),
        "Alert".to_string(),
    )
    .with_subject("Important".to_string());
    assert_eq!(n.subject, Some("Important".to_string()));
}

#[test]
fn test_notification_with_template_data_builder() {
    let mut data = HashMap::new();
    data.insert("key".to_string(), "value".to_string());
    let n = Notification::new(
        NotificationType::PaymentConfirmed,
        NotificationChannel::SMS,
        "+34600111222".to_string(),
        "Payment OK".to_string(),
    )
    .with_template_data(data);
    assert_eq!(n.template_data.get("key").unwrap(), "value");
}

#[test]
fn test_notification_mark_sent_updates_status_and_timestamp() {
    let mut n = Notification::new(
        NotificationType::CheckInReminder,
        NotificationChannel::WhatsApp,
        "+34600".to_string(),
        "Reminder".to_string(),
    );
    assert!(n.sent_at.is_none());
    n.mark_sent();
    assert!(matches!(n.status, NotificationStatus::Sent));
    assert!(n.sent_at.is_some());
}

#[test]
fn test_notification_mark_delivered_updates_status_and_timestamp() {
    let mut n = Notification::new(
        NotificationType::ReservationCancelled,
        NotificationChannel::Telegram,
        "chat123".to_string(),
        "Cancelled".to_string(),
    );
    n.mark_delivered();
    assert!(matches!(n.status, NotificationStatus::Delivered));
    assert!(n.delivered_at.is_some());
}

#[test]
fn test_notification_mark_failed_stores_error() {
    let mut n = Notification::new(
        NotificationType::MirSubmissionUpdate,
        NotificationChannel::Email,
        "test@test.com".to_string(),
        "Update".to_string(),
    );
    n.mark_failed("Connection refused".to_string());
    assert!(matches!(n.status, NotificationStatus::Failed));
    assert_eq!(n.error_message, Some("Connection refused".to_string()));
}

#[test]
fn test_notification_full_serde_roundtrip() {
    let n = Notification::new(
        NotificationType::ReservationExpired,
        NotificationChannel::Email,
        "expired@test.com".to_string(),
        "Your reservation has expired".to_string(),
    )
    .with_subject("Expired".to_string());

    let json = serde_json::to_string(&n).unwrap();
    let back: Notification = serde_json::from_str(&json).unwrap();
    assert_eq!(back.id, n.id);
    assert_eq!(back.recipient, "expired@test.com");
    assert_eq!(back.subject, Some("Expired".to_string()));
}

#[test]
fn test_notification_channel_all_variants_serde() {
    let channels = vec![
        NotificationChannel::Email,
        NotificationChannel::SMS,
        NotificationChannel::WhatsApp,
        NotificationChannel::Telegram,
    ];
    for ch in &channels {
        let json = serde_json::to_string(ch).unwrap();
        let back: NotificationChannel = serde_json::from_str(&json).unwrap();
        assert_eq!(&back, ch);
    }
}

#[test]
fn test_notification_status_all_variants_serde() {
    let statuses = vec![
        NotificationStatus::Pending,
        NotificationStatus::Sent,
        NotificationStatus::Delivered,
        NotificationStatus::Failed,
        NotificationStatus::Bounced,
    ];
    for s in statuses {
        let json = serde_json::to_string(&s).unwrap();
        let back: NotificationStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(format!("{back:?}"), format!("{s:?}"));
    }
}

#[test]
fn test_notification_template_construction_and_serde() {
    let tmpl = NotificationTemplate {
        id: "tmpl-booking".to_string(),
        notification_type: NotificationType::ReservationCreated,
        channel: NotificationChannel::Email,
        language: "es".to_string(),
        subject_template: Some("Reserva Confirmada".to_string()),
        message_template: "Hola {{name}}".to_string(),
        variables: vec!["name".to_string()],
    };
    let json = serde_json::to_string(&tmpl).unwrap();
    let back: NotificationTemplate = serde_json::from_str(&json).unwrap();
    assert_eq!(back.id, "tmpl-booking");
    assert_eq!(back.language, "es");
    assert_eq!(back.variables, vec!["name"]);
}

#[test]
fn test_booking_notification_data_optional_fields() {
    let data = BookingNotificationData {
        booking_id: "BK-100".to_string(),
        pilgrim_name: "Test".to_string(),
        pilgrim_email: "test@test.com".to_string(),
        pilgrim_phone: None,
        check_in_date: "2026-01-01".to_string(),
        check_out_date: "2026-01-02".to_string(),
        bed_number: 1,
        room_type: "shared".to_string(),
        total_amount: 10.0,
        payment_method: None,
    };
    let json = serde_json::to_string(&data).unwrap();
    let back: BookingNotificationData = serde_json::from_str(&json).unwrap();
    assert!(back.pilgrim_phone.is_none());
    assert!(back.payment_method.is_none());
}

#[test]
fn test_payment_notification_data_with_receipt() {
    let data = PaymentNotificationData {
        booking_id: "BK-200".to_string(),
        payment_id: "PAY-300".to_string(),
        amount: 25.99,
        currency: "EUR".to_string(),
        payment_method: "stripe".to_string(),
        transaction_id: "TXN-ABC".to_string(),
        receipt_url: Some("https://example.com/receipt".to_string()),
    };
    let json = serde_json::to_string(&data).unwrap();
    let back: PaymentNotificationData = serde_json::from_str(&json).unwrap();
    assert_eq!(
        back.receipt_url,
        Some("https://example.com/receipt".to_string())
    );
}
