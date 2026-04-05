// Domain Events for Albergue Carrascalejo
// Following CloudEvents specification with lenient parsing
// Topic naming convention: albergue.v1.{aggregate}.{event}

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// `CloudEvents` envelope for domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudEvent<T> {
    /// `CloudEvents` version (default: "1.0")
    #[serde(default = "default_spec_version")]
    pub specversion: String,

    /// Event type following topic convention: albergue.v1.{aggregate}.{event}
    #[serde(rename = "type")]
    pub event_type: String,

    /// Event source (e.g., "booking-service", "notification-service")
    pub source: String,

    /// Unique event ID
    pub id: String,

    /// Event timestamp
    pub time: DateTime<Utc>,

    /// Content type (default: "application/json")
    #[serde(default = "default_content_type")]
    pub datacontenttype: String,

    /// Event data payload
    pub data: T,
}

fn default_spec_version() -> String {
    "1.0".to_string()
}

fn default_content_type() -> String {
    "application/json".to_string()
}

impl<T> CloudEvent<T> {
    pub fn new(event_type: String, source: String, data: T) -> Self {
        Self {
            specversion: "1.0".to_string(),
            event_type,
            source,
            id: uuid::Uuid::new_v4().to_string(),
            time: Utc::now(),
            datacontenttype: "application/json".to_string(),
            data,
        }
    }
}

// ============================================================================
// Pilgrim Aggregate Events (albergue.v1.pilgrim.*)
// ============================================================================

/// Topic: `albergue.v1.pilgrim.registered`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PilgrimRegistered {
    pub pilgrim_id: String,
    pub document_type: String,
    pub document_number: String,
    pub full_name: String,
    pub nationality_code: String,
    pub email: Option<String>,
    pub phone: Option<String>,
}

/// Topic: `albergue.v1.pilgrim.updated`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PilgrimUpdated {
    pub pilgrim_id: String,
    pub updated_fields: Vec<String>,
}

/// Topic: `albergue.v1.pilgrim.gdpr_consent_recorded`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GDPRConsentRecorded {
    pub pilgrim_id: String,
    pub consent_marketing: bool,
    pub consent_data_processing: bool,
    pub data_retention_until: Option<DateTime<Utc>>,
}

// ============================================================================
// Booking Aggregate Events (albergue.v1.booking.*)
// ============================================================================

/// Topic: `albergue.v1.booking.reserved`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingReserved {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub check_in_date: String,
    pub check_out_date: String,
    pub nights: i32,
    pub total_amount: f64,
    pub expires_at: DateTime<Utc>,
}

/// Topic: `albergue.v1.booking.bed_assigned`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingBedAssigned {
    pub booking_id: String,
    pub bed_id: String,
    pub bed_number: i32,
    pub room_type: String,
}

/// Topic: `albergue.v1.booking.confirmed`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingConfirmed {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub check_in_date: String,
    pub check_out_date: String,
    pub bed_id: Option<String>,
}

/// Topic: `albergue.v1.booking.cancelled`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingCancelled {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub reason: Option<String>,
    pub cancelled_at: DateTime<Utc>,
}

/// Topic: `albergue.v1.booking.expired`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingExpired {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub expired_at: DateTime<Utc>,
}

// ============================================================================
// Payment Aggregate Events (albergue.v1.payment.*)
// ============================================================================

/// Topic: `albergue.v1.payment.recorded`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRecorded {
    pub payment_id: String,
    pub booking_id: String,
    pub amount: f64,
    pub currency: String,
    pub payment_method: String,
}

/// Topic: `albergue.v1.payment.completed`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentCompleted {
    pub payment_id: String,
    pub booking_id: String,
    pub amount: f64,
    pub currency: String,
    pub provider_transaction_id: Option<String>,
}

// ============================================================================
// Government Submission Events (albergue.v1.government.*)
// ============================================================================

/// Topic: `albergue.v1.government.submission_queued`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentSubmissionQueued {
    pub submission_id: String,
    pub booking_id: String,
    pub submission_type: String,
}

/// Topic: `albergue.v1.government.submission_succeeded`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentSubmissionSucceeded {
    pub submission_id: String,
    pub booking_id: String,
    pub submitted_at: DateTime<Utc>,
    pub confirmation_id: Option<String>,
}

/// Topic: `albergue.v1.government.submission_failed`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentSubmissionFailed {
    pub submission_id: String,
    pub booking_id: String,
    pub error_message: String,
    pub attempts: i32,
}

// ============================================================================
// Bed Aggregate Events (albergue.v1.bed.*)
// ============================================================================

/// Topic: `albergue.v1.bed.status_changed`
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BedStatusChanged {
    pub bed_id: String,
    pub bed_number: i32,
    pub old_status: String,
    pub new_status: String,
    pub reason: Option<String>,
}

// ============================================================================
// Event Type Constants
// ============================================================================

pub mod topics {
    // Pilgrim events
    pub const PILGRIM_REGISTERED: &str = "albergue.v1.pilgrim.registered";
    pub const PILGRIM_UPDATED: &str = "albergue.v1.pilgrim.updated";
    pub const GDPR_CONSENT_RECORDED: &str = "albergue.v1.pilgrim.gdpr_consent_recorded";

    // Booking events
    pub const BOOKING_RESERVED: &str = "albergue.v1.booking.reserved";
    pub const BOOKING_BED_ASSIGNED: &str = "albergue.v1.booking.bed_assigned";
    pub const BOOKING_CONFIRMED: &str = "albergue.v1.booking.confirmed";
    pub const BOOKING_CANCELLED: &str = "albergue.v1.booking.cancelled";
    pub const BOOKING_EXPIRED: &str = "albergue.v1.booking.expired";

    // Payment events
    pub const PAYMENT_RECORDED: &str = "albergue.v1.payment.recorded";
    pub const PAYMENT_COMPLETED: &str = "albergue.v1.payment.completed";

    // Government submission events
    pub const GOVERNMENT_SUBMISSION_QUEUED: &str = "albergue.v1.government.submission_queued";
    pub const GOVERNMENT_SUBMISSION_SUCCEEDED: &str = "albergue.v1.government.submission_succeeded";
    pub const GOVERNMENT_SUBMISSION_FAILED: &str = "albergue.v1.government.submission_failed";

    // Bed events
    pub const BED_STATUS_CHANGED: &str = "albergue.v1.bed.status_changed";
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- CloudEvent ---

    #[test]
    fn test_cloud_event_new() {
        let event = CloudEvent::new(
            "albergue.v1.booking.reserved".to_string(),
            "booking-service".to_string(),
            serde_json::json!({"booking_id": "123"}),
        );
        assert_eq!(event.specversion, "1.0");
        assert_eq!(event.event_type, "albergue.v1.booking.reserved");
        assert_eq!(event.source, "booking-service");
        assert_eq!(event.datacontenttype, "application/json");
        assert!(!event.id.is_empty());
    }

    #[test]
    fn test_cloud_event_serialize_deserialize() {
        let event = CloudEvent::new(
            "albergue.v1.test".to_string(),
            "test-source".to_string(),
            serde_json::json!({"key": "value"}),
        );
        let json = serde_json::to_string(&event).unwrap();
        let back: CloudEvent<serde_json::Value> = serde_json::from_str(&json).unwrap();
        assert_eq!(back.event_type, "albergue.v1.test");
        assert_eq!(back.source, "test-source");
        assert_eq!(back.specversion, "1.0");
    }

    #[test]
    fn test_cloud_event_defaults_on_deserialize() {
        // specversion and datacontenttype should default when missing
        let json = r#"{
            "type": "test.event",
            "source": "test",
            "id": "abc",
            "time": "2025-01-01T00:00:00Z",
            "data": {"foo": "bar"}
        }"#;
        let event: CloudEvent<serde_json::Value> = serde_json::from_str(json).unwrap();
        assert_eq!(event.specversion, "1.0");
        assert_eq!(event.datacontenttype, "application/json");
    }

    #[test]
    fn test_cloud_event_unique_ids() {
        let e1 = CloudEvent::new("t".to_string(), "s".to_string(), ());
        let e2 = CloudEvent::new("t".to_string(), "s".to_string(), ());
        assert_ne!(e1.id, e2.id);
    }

    #[test]
    fn test_cloud_event_clone() {
        let event = CloudEvent::new(
            "test".to_string(),
            "source".to_string(),
            "payload".to_string(),
        );
        let cloned = event.clone();
        assert_eq!(cloned.event_type, event.event_type);
        assert_eq!(cloned.source, event.source);
        assert_eq!(cloned.id, event.id);
    }

    #[test]
    fn test_cloud_event_with_struct_data() {
        let data = PilgrimRegistered {
            pilgrim_id: "p1".to_string(),
            document_type: "DNI".to_string(),
            document_number: "12345678A".to_string(),
            full_name: "Juan Garcia".to_string(),
            nationality_code: "ES".to_string(),
            email: Some("juan@example.com".to_string()),
            phone: None,
        };
        let event = CloudEvent::new(
            topics::PILGRIM_REGISTERED.to_string(),
            "test".to_string(),
            data,
        );
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("Juan Garcia"));
    }

    // --- Event Data Structs ---

    #[test]
    fn test_pilgrim_registered_roundtrip() {
        let data = PilgrimRegistered {
            pilgrim_id: "p1".to_string(),
            document_type: "DNI".to_string(),
            document_number: "12345678A".to_string(),
            full_name: "Juan Garcia".to_string(),
            nationality_code: "ES".to_string(),
            email: Some("juan@test.com".to_string()),
            phone: Some("+34600000000".to_string()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: PilgrimRegistered = serde_json::from_str(&json).unwrap();
        assert_eq!(back.pilgrim_id, "p1");
        assert_eq!(back.email, Some("juan@test.com".to_string()));
    }

    #[test]
    fn test_pilgrim_updated_roundtrip() {
        let data = PilgrimUpdated {
            pilgrim_id: "p1".to_string(),
            updated_fields: vec!["name".to_string(), "email".to_string()],
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: PilgrimUpdated = serde_json::from_str(&json).unwrap();
        assert_eq!(back.updated_fields.len(), 2);
    }

    #[test]
    fn test_gdpr_consent_recorded_roundtrip() {
        let data = GDPRConsentRecorded {
            pilgrim_id: "p1".to_string(),
            consent_marketing: false,
            consent_data_processing: true,
            data_retention_until: None,
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: GDPRConsentRecorded = serde_json::from_str(&json).unwrap();
        assert!(!back.consent_marketing);
        assert!(back.consent_data_processing);
    }

    #[test]
    fn test_booking_reserved_roundtrip() {
        let data = BookingReserved {
            booking_id: "b1".to_string(),
            pilgrim_id: "p1".to_string(),
            check_in_date: "2025-06-15".to_string(),
            check_out_date: "2025-06-17".to_string(),
            nights: 2,
            total_amount: 24.0,
            expires_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingReserved = serde_json::from_str(&json).unwrap();
        assert_eq!(back.nights, 2);
        assert!((back.total_amount - 24.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_booking_bed_assigned_roundtrip() {
        let data = BookingBedAssigned {
            booking_id: "b1".to_string(),
            bed_id: "bed-5".to_string(),
            bed_number: 5,
            room_type: "DormA".to_string(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingBedAssigned = serde_json::from_str(&json).unwrap();
        assert_eq!(back.bed_number, 5);
    }

    #[test]
    fn test_booking_confirmed_roundtrip() {
        let data = BookingConfirmed {
            booking_id: "b1".to_string(),
            pilgrim_id: "p1".to_string(),
            check_in_date: "2025-06-15".to_string(),
            check_out_date: "2025-06-17".to_string(),
            bed_id: Some("bed-3".to_string()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingConfirmed = serde_json::from_str(&json).unwrap();
        assert_eq!(back.bed_id, Some("bed-3".to_string()));
    }

    #[test]
    fn test_booking_confirmed_no_bed() {
        let data = BookingConfirmed {
            booking_id: "b1".to_string(),
            pilgrim_id: "p1".to_string(),
            check_in_date: "2025-06-15".to_string(),
            check_out_date: "2025-06-17".to_string(),
            bed_id: None,
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingConfirmed = serde_json::from_str(&json).unwrap();
        assert!(back.bed_id.is_none());
    }

    #[test]
    fn test_booking_cancelled_roundtrip() {
        let data = BookingCancelled {
            booking_id: "b1".to_string(),
            pilgrim_id: "p1".to_string(),
            reason: Some("guest request".to_string()),
            cancelled_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingCancelled = serde_json::from_str(&json).unwrap();
        assert_eq!(back.reason, Some("guest request".to_string()));
    }

    #[test]
    fn test_booking_expired_roundtrip() {
        let data = BookingExpired {
            booking_id: "b1".to_string(),
            pilgrim_id: "p1".to_string(),
            expired_at: chrono::Utc::now(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BookingExpired = serde_json::from_str(&json).unwrap();
        assert_eq!(back.booking_id, "b1");
    }

    #[test]
    fn test_payment_recorded_roundtrip() {
        let data = PaymentRecorded {
            payment_id: "pay1".to_string(),
            booking_id: "b1".to_string(),
            amount: 12.0,
            currency: "EUR".to_string(),
            payment_method: "card".to_string(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: PaymentRecorded = serde_json::from_str(&json).unwrap();
        assert_eq!(back.currency, "EUR");
    }

    #[test]
    fn test_payment_completed_roundtrip() {
        let data = PaymentCompleted {
            payment_id: "pay1".to_string(),
            booking_id: "b1".to_string(),
            amount: 12.0,
            currency: "EUR".to_string(),
            provider_transaction_id: Some("txn_abc".to_string()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: PaymentCompleted = serde_json::from_str(&json).unwrap();
        assert_eq!(back.provider_transaction_id, Some("txn_abc".to_string()));
    }

    #[test]
    fn test_government_submission_queued_roundtrip() {
        let data = GovernmentSubmissionQueued {
            submission_id: "sub1".to_string(),
            booking_id: "b1".to_string(),
            submission_type: "hospedaje".to_string(),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: GovernmentSubmissionQueued = serde_json::from_str(&json).unwrap();
        assert_eq!(back.submission_type, "hospedaje");
    }

    #[test]
    fn test_government_submission_succeeded_roundtrip() {
        let data = GovernmentSubmissionSucceeded {
            submission_id: "sub1".to_string(),
            booking_id: "b1".to_string(),
            submitted_at: chrono::Utc::now(),
            confirmation_id: Some("conf123".to_string()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: GovernmentSubmissionSucceeded = serde_json::from_str(&json).unwrap();
        assert_eq!(back.confirmation_id, Some("conf123".to_string()));
    }

    #[test]
    fn test_government_submission_failed_roundtrip() {
        let data = GovernmentSubmissionFailed {
            submission_id: "sub1".to_string(),
            booking_id: "b1".to_string(),
            error_message: "timeout".to_string(),
            attempts: 3,
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: GovernmentSubmissionFailed = serde_json::from_str(&json).unwrap();
        assert_eq!(back.attempts, 3);
    }

    #[test]
    fn test_bed_status_changed_roundtrip() {
        let data = BedStatusChanged {
            bed_id: "bed-1".to_string(),
            bed_number: 1,
            old_status: "available".to_string(),
            new_status: "occupied".to_string(),
            reason: Some("check-in".to_string()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: BedStatusChanged = serde_json::from_str(&json).unwrap();
        assert_eq!(back.new_status, "occupied");
    }

    // --- Topic Constants ---

    #[test]
    fn test_topic_constants_format() {
        assert_eq!(topics::PILGRIM_REGISTERED, "albergue.v1.pilgrim.registered");
        assert_eq!(topics::PILGRIM_UPDATED, "albergue.v1.pilgrim.updated");
        assert_eq!(
            topics::GDPR_CONSENT_RECORDED,
            "albergue.v1.pilgrim.gdpr_consent_recorded"
        );
        assert_eq!(topics::BOOKING_RESERVED, "albergue.v1.booking.reserved");
        assert_eq!(
            topics::BOOKING_BED_ASSIGNED,
            "albergue.v1.booking.bed_assigned"
        );
        assert_eq!(topics::BOOKING_CONFIRMED, "albergue.v1.booking.confirmed");
        assert_eq!(topics::BOOKING_CANCELLED, "albergue.v1.booking.cancelled");
        assert_eq!(topics::BOOKING_EXPIRED, "albergue.v1.booking.expired");
        assert_eq!(topics::PAYMENT_RECORDED, "albergue.v1.payment.recorded");
        assert_eq!(topics::PAYMENT_COMPLETED, "albergue.v1.payment.completed");
        assert_eq!(
            topics::GOVERNMENT_SUBMISSION_QUEUED,
            "albergue.v1.government.submission_queued"
        );
        assert_eq!(
            topics::GOVERNMENT_SUBMISSION_SUCCEEDED,
            "albergue.v1.government.submission_succeeded"
        );
        assert_eq!(
            topics::GOVERNMENT_SUBMISSION_FAILED,
            "albergue.v1.government.submission_failed"
        );
        assert_eq!(topics::BED_STATUS_CHANGED, "albergue.v1.bed.status_changed");
    }

    #[test]
    fn test_all_topics_start_with_albergue_v1() {
        let all_topics = vec![
            topics::PILGRIM_REGISTERED,
            topics::PILGRIM_UPDATED,
            topics::GDPR_CONSENT_RECORDED,
            topics::BOOKING_RESERVED,
            topics::BOOKING_BED_ASSIGNED,
            topics::BOOKING_CONFIRMED,
            topics::BOOKING_CANCELLED,
            topics::BOOKING_EXPIRED,
            topics::PAYMENT_RECORDED,
            topics::PAYMENT_COMPLETED,
            topics::GOVERNMENT_SUBMISSION_QUEUED,
            topics::GOVERNMENT_SUBMISSION_SUCCEEDED,
            topics::GOVERNMENT_SUBMISSION_FAILED,
            topics::BED_STATUS_CHANGED,
        ];
        for topic in all_topics {
            assert!(
                topic.starts_with("albergue.v1."),
                "Topic {topic} does not start with albergue.v1."
            );
        }
    }
}
