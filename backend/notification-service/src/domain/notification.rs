use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[allow(clippy::wildcard_imports)]
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub recipient: String,
    pub subject: Option<String>,
    pub message: String,
    pub template_data: HashMap<String, String>,
    pub status: NotificationStatus,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
    pub delivered_at: Option<DateTime<Utc>>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    ReservationCreated,
    PaymentConfirmed,
    ReservationExpired,
    ReservationCancelled,
    CheckInReminder,
    AdminAlert,
    MirSubmissionUpdate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NotificationChannel {
    Email,
    SMS,
    WhatsApp,
    Telegram,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationStatus {
    Pending,
    Sent,
    Delivered,
    Failed,
    Bounced,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationTemplate {
    pub id: String,
    pub notification_type: NotificationType,
    pub channel: NotificationChannel,
    pub language: String,
    pub subject_template: Option<String>,
    pub message_template: String,
    pub variables: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingNotificationData {
    pub booking_id: String,
    pub pilgrim_name: String,
    pub pilgrim_email: String,
    pub pilgrim_phone: Option<String>,
    pub check_in_date: String,
    pub check_out_date: String,
    pub bed_number: i32,
    pub room_type: String,
    pub total_amount: f64,
    pub payment_method: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentNotificationData {
    pub booking_id: String,
    pub payment_id: String,
    pub amount: f64,
    pub currency: String,
    pub payment_method: String,
    pub transaction_id: String,
    pub receipt_url: Option<String>,
}

#[allow(dead_code)]
impl Notification {
    pub fn new(
        notification_type: NotificationType,
        channel: NotificationChannel,
        recipient: String,
        message: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            notification_type,
            channel,
            recipient,
            subject: None,
            message,
            template_data: HashMap::new(),
            status: NotificationStatus::Pending,
            created_at: Utc::now(),
            sent_at: None,
            delivered_at: None,
            error_message: None,
        }
    }

    pub fn with_subject(mut self, subject: String) -> Self {
        self.subject = Some(subject);
        self
    }

    pub fn with_template_data(mut self, data: HashMap<String, String>) -> Self {
        self.template_data = data;
        self
    }

    #[tracing::instrument(skip(self))]
    pub fn mark_sent(&mut self) {
        self.status = NotificationStatus::Sent;
        self.sent_at = Some(Utc::now());
    }

    #[tracing::instrument(skip(self))]
    pub fn mark_delivered(&mut self) {
        self.status = NotificationStatus::Delivered;
        self.delivered_at = Some(Utc::now());
    }

    #[tracing::instrument(skip(self))]
    pub fn mark_failed(&mut self, error: String) {
        self.status = NotificationStatus::Failed;
        self.error_message = Some(error);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_notification() -> Notification {
        Notification::new(
            NotificationType::ReservationCreated,
            NotificationChannel::Email,
            "test@example.com".to_string(),
            "Hello pilgrim".to_string(),
        )
    }

    // --- Notification struct construction and field access ---

    #[test]
    fn test_notification_new_sets_defaults() {
        let n = make_notification();
        assert_eq!(n.recipient, "test@example.com");
        assert_eq!(n.message, "Hello pilgrim");
        assert!(n.subject.is_none());
        assert!(n.sent_at.is_none());
        assert!(n.delivered_at.is_none());
        assert!(n.error_message.is_none());
        assert!(n.template_data.is_empty());
        assert!(matches!(n.status, NotificationStatus::Pending));
        assert!(matches!(n.channel, NotificationChannel::Email));
    }

    #[test]
    fn test_notification_with_subject() {
        let n = make_notification().with_subject("Subject line".to_string());
        assert_eq!(n.subject, Some("Subject line".to_string()));
    }

    #[test]
    fn test_notification_with_template_data() {
        let mut data = HashMap::new();
        data.insert("name".to_string(), "Alice".to_string());
        let n = make_notification().with_template_data(data);
        assert_eq!(n.template_data.get("name").unwrap(), "Alice");
    }

    #[test]
    fn test_notification_mark_sent() {
        let mut n = make_notification();
        n.mark_sent();
        assert!(matches!(n.status, NotificationStatus::Sent));
        assert!(n.sent_at.is_some());
    }

    #[test]
    fn test_notification_mark_delivered() {
        let mut n = make_notification();
        n.mark_delivered();
        assert!(matches!(n.status, NotificationStatus::Delivered));
        assert!(n.delivered_at.is_some());
    }

    #[test]
    fn test_notification_mark_failed() {
        let mut n = make_notification();
        n.mark_failed("timeout".to_string());
        assert!(matches!(n.status, NotificationStatus::Failed));
        assert_eq!(n.error_message, Some("timeout".to_string()));
    }

    #[test]
    fn test_notification_clone() {
        let n = make_notification();
        let cloned = n.clone();
        assert_eq!(n.id, cloned.id);
        assert_eq!(n.recipient, cloned.recipient);
    }

    // --- NotificationType enum serde ---

    #[test]
    fn test_notification_type_serialize_all_variants() {
        let variants = vec![
            NotificationType::ReservationCreated,
            NotificationType::PaymentConfirmed,
            NotificationType::ReservationExpired,
            NotificationType::ReservationCancelled,
            NotificationType::CheckInReminder,
            NotificationType::AdminAlert,
            NotificationType::MirSubmissionUpdate,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: NotificationType = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{back:?}"), format!("{v:?}"));
        }
    }

    #[test]
    fn test_notification_type_deserialize_reservation_created() {
        let t: NotificationType = serde_json::from_str("\"ReservationCreated\"").unwrap();
        assert!(matches!(t, NotificationType::ReservationCreated));
    }

    #[test]
    fn test_notification_type_deserialize_invalid() {
        let result = serde_json::from_str::<NotificationType>("\"InvalidType\"");
        assert!(result.is_err());
    }

    // --- NotificationChannel enum serde ---

    #[test]
    fn test_channel_serialize_all_variants() {
        let variants = vec![
            NotificationChannel::Email,
            NotificationChannel::SMS,
            NotificationChannel::WhatsApp,
            NotificationChannel::Telegram,
        ];
        for v in &variants {
            let json = serde_json::to_string(v).unwrap();
            let back: NotificationChannel = serde_json::from_str(&json).unwrap();
            assert_eq!(&back, v);
        }
    }

    #[test]
    fn test_channel_equality() {
        assert_eq!(NotificationChannel::Email, NotificationChannel::Email);
        assert_ne!(NotificationChannel::Email, NotificationChannel::SMS);
    }

    // --- NotificationStatus enum serde ---

    #[test]
    fn test_status_serialize_all_variants() {
        let variants = vec![
            NotificationStatus::Pending,
            NotificationStatus::Sent,
            NotificationStatus::Delivered,
            NotificationStatus::Failed,
            NotificationStatus::Bounced,
        ];
        for v in variants {
            let json = serde_json::to_string(&v).unwrap();
            let back: NotificationStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(format!("{back:?}"), format!("{v:?}"));
        }
    }

    // --- NotificationTemplate ---

    #[test]
    fn test_notification_template_construction() {
        let tmpl = NotificationTemplate {
            id: "tmpl-1".to_string(),
            notification_type: NotificationType::ReservationCreated,
            channel: NotificationChannel::Email,
            language: "es".to_string(),
            subject_template: Some("Confirmacion".to_string()),
            message_template: "Hola {{name}}".to_string(),
            variables: vec!["name".to_string()],
        };
        assert_eq!(tmpl.id, "tmpl-1");
        assert_eq!(tmpl.language, "es");
        assert_eq!(tmpl.variables.len(), 1);
    }

    #[test]
    fn test_notification_template_serde_roundtrip() {
        let tmpl = NotificationTemplate {
            id: "t1".to_string(),
            notification_type: NotificationType::AdminAlert,
            channel: NotificationChannel::Telegram,
            language: "en".to_string(),
            subject_template: None,
            message_template: "Alert: {{msg}}".to_string(),
            variables: vec!["msg".to_string()],
        };
        let json = serde_json::to_string(&tmpl).unwrap();
        let back: NotificationTemplate = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, "t1");
        assert!(back.subject_template.is_none());
    }

    // --- BookingNotificationData ---

    #[test]
    fn test_booking_notification_data_construction() {
        let data = BookingNotificationData {
            booking_id: "BK-001".to_string(),
            pilgrim_name: "Juan".to_string(),
            pilgrim_email: "juan@example.com".to_string(),
            pilgrim_phone: Some("+34600111222".to_string()),
            check_in_date: "2026-06-01".to_string(),
            check_out_date: "2026-06-02".to_string(),
            bed_number: 5,
            room_type: "dormitory".to_string(),
            total_amount: 12.50,
            payment_method: Some("card".to_string()),
        };
        assert_eq!(data.booking_id, "BK-001");
        assert_eq!(data.bed_number, 5);
        assert!((data.total_amount - 12.50).abs() < f64::EPSILON);
    }

    #[test]
    fn test_booking_notification_data_serde_roundtrip() {
        let data = BookingNotificationData {
            booking_id: "BK-002".to_string(),
            pilgrim_name: "Maria".to_string(),
            pilgrim_email: "maria@test.com".to_string(),
            pilgrim_phone: None,
            check_in_date: "2026-07-01".to_string(),
            check_out_date: "2026-07-03".to_string(),
            bed_number: 12,
            room_type: "private".to_string(),
            total_amount: 25.0,
            payment_method: None,
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingNotificationData = serde_json::from_str(&json).unwrap();
        assert_eq!(back.pilgrim_name, "Maria");
        assert!(back.pilgrim_phone.is_none());
    }

    // --- PaymentNotificationData ---

    #[test]
    fn test_payment_notification_data_construction() {
        let data = PaymentNotificationData {
            booking_id: "BK-001".to_string(),
            payment_id: "PAY-100".to_string(),
            amount: 12.50,
            currency: "EUR".to_string(),
            payment_method: "card".to_string(),
            transaction_id: "TXN-999".to_string(),
            receipt_url: Some("https://receipt.example.com/1".to_string()),
        };
        assert_eq!(data.payment_id, "PAY-100");
        assert_eq!(data.currency, "EUR");
    }

    #[test]
    fn test_payment_notification_data_serde_roundtrip() {
        let data = PaymentNotificationData {
            booking_id: "BK-003".to_string(),
            payment_id: "PAY-200".to_string(),
            amount: 30.0,
            currency: "EUR".to_string(),
            payment_method: "cash".to_string(),
            transaction_id: "TXN-456".to_string(),
            receipt_url: None,
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: PaymentNotificationData = serde_json::from_str(&json).unwrap();
        assert_eq!(back.transaction_id, "TXN-456");
        assert!(back.receipt_url.is_none());
    }

    // --- Full Notification serde roundtrip ---

    #[test]
    fn test_notification_serde_roundtrip() {
        let n = make_notification().with_subject("Test Subject".to_string());
        let json = serde_json::to_string(&n).unwrap();
        let back: Notification = serde_json::from_str(&json).unwrap();
        assert_eq!(back.id, n.id);
        assert_eq!(back.recipient, "test@example.com");
        assert_eq!(back.subject, Some("Test Subject".to_string()));
    }

    #[test]
    fn test_notification_debug_format() {
        let n = make_notification();
        let debug = format!("{n:?}");
        assert!(debug.contains("test@example.com"));
        assert!(debug.contains("Hello pilgrim"));
    }
}
