use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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

    pub fn mark_sent(&mut self) {
        self.status = NotificationStatus::Sent;
        self.sent_at = Some(Utc::now());
    }

    pub fn mark_delivered(&mut self) {
        self.status = NotificationStatus::Delivered;
        self.delivered_at = Some(Utc::now());
    }

    pub fn mark_failed(&mut self, error: String) {
        self.status = NotificationStatus::Failed;
        self.error_message = Some(error);
    }
}
