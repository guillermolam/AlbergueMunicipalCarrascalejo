// Domain Events for Albergue Carrascalejo
// Following CloudEvents specification with lenient parsing
// Topic naming convention: albergue.v1.{aggregate}.{event}

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// CloudEvents envelope for domain events
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudEvent<T> {
    /// CloudEvents version (default: "1.0")
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

/// Topic: albergue.v1.pilgrim.registered
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

/// Topic: albergue.v1.pilgrim.updated
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PilgrimUpdated {
    pub pilgrim_id: String,
    pub updated_fields: Vec<String>,
}

/// Topic: albergue.v1.pilgrim.gdpr_consent_recorded
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

/// Topic: albergue.v1.booking.reserved
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

/// Topic: albergue.v1.booking.bed_assigned
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingBedAssigned {
    pub booking_id: String,
    pub bed_id: String,
    pub bed_number: i32,
    pub room_type: String,
}

/// Topic: albergue.v1.booking.confirmed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingConfirmed {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub check_in_date: String,
    pub check_out_date: String,
    pub bed_id: Option<String>,
}

/// Topic: albergue.v1.booking.cancelled
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingCancelled {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub reason: Option<String>,
    pub cancelled_at: DateTime<Utc>,
}

/// Topic: albergue.v1.booking.expired
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookingExpired {
    pub booking_id: String,
    pub pilgrim_id: String,
    pub expired_at: DateTime<Utc>,
}

// ============================================================================
// Payment Aggregate Events (albergue.v1.payment.*)
// ============================================================================

/// Topic: albergue.v1.payment.recorded
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentRecorded {
    pub payment_id: String,
    pub booking_id: String,
    pub amount: f64,
    pub currency: String,
    pub payment_method: String,
}

/// Topic: albergue.v1.payment.completed
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

/// Topic: albergue.v1.government.submission_queued
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentSubmissionQueued {
    pub submission_id: String,
    pub booking_id: String,
    pub submission_type: String,
}

/// Topic: albergue.v1.government.submission_succeeded
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GovernmentSubmissionSucceeded {
    pub submission_id: String,
    pub booking_id: String,
    pub submitted_at: DateTime<Utc>,
    pub confirmation_id: Option<String>,
}

/// Topic: albergue.v1.government.submission_failed
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

/// Topic: albergue.v1.bed.status_changed
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
