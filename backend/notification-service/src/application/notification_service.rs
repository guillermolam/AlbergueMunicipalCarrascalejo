use crate::adapters::email::nodemailer::NodemailerAdapter;
use crate::domain::notification::{
    Notification, NotificationChannel, NotificationStatus, NotificationType,
};
use anyhow::Result;

pub struct NotificationService {
    email_adapter: NodemailerAdapter,
}

impl NotificationService {
    pub fn new() -> Self {
        Self {
            email_adapter: NodemailerAdapter::new(),
        }
    }

    #[tracing::instrument(skip(self, notification))]
    pub async fn send_with_fallback(
        &self,
        notification: Notification,
        channels: Vec<NotificationChannel>,
    ) -> Result<Notification> {
        let mut notification = notification;

        for channel in channels {
            if channel == NotificationChannel::Email {
                match self.email_adapter.send_email(&notification).await {
                    Ok((_message_id, _status)) => {
                        notification.status = NotificationStatus::Sent;
                        notification.channel = channel;
                        return Ok(notification);
                    }
                    Err(_) => continue,
                }
            }
        }

        notification.status = NotificationStatus::Failed;
        Ok(notification)
    }

    #[tracing::instrument(skip(self, notifications))]
    pub async fn send_bulk(&self, notifications: Vec<Notification>) -> Result<Vec<Notification>> {
        let mut results = Vec::new();
        for notification in notifications {
            let result = self
                .send_with_fallback(notification, vec![NotificationChannel::Email])
                .await?;
            results.push(result);
        }
        Ok(results)
    }

    #[tracing::instrument(skip(self))]
    pub async fn send_booking_confirmation(
        &self,
        guest_email: &str,
        _guest_phone: Option<&str>,
        booking_details: &str,
    ) -> Result<Vec<Notification>> {
        let email_notification = Notification {
            id: uuid::Uuid::new_v4(),
            notification_type: NotificationType::ReservationCreated,
            recipient: guest_email.to_string(),
            subject: Some("Booking Confirmation - Albergue Del Carrascalejo".to_string()),
            message: format!("Your booking has been confirmed. Details: {booking_details}"),
            channel: NotificationChannel::Email,
            template_data: std::collections::HashMap::new(),
            status: NotificationStatus::Pending,
            created_at: chrono::Utc::now(),
            sent_at: None,
            delivered_at: None,
            error_message: None,
        };

        self.send_bulk(vec![email_notification]).await
    }
}

#[allow(dead_code)]
pub fn create_booking_template(
    guest_name: &str,
    booking_id: &str,
    check_in: &str,
    check_out: &str,
) -> String {
    format!(
        "Hola {guest_name}, tu reserva {booking_id} ha sido confirmada. Check-in: {check_in}, Check-out: {check_out}. ¡Te esperamos!"
    )
}

#[allow(dead_code)]
pub fn create_payment_template(amount: i32, payment_method: &str) -> String {
    format!(
        "Pago recibido: {}€ via {payment_method}. Gracias por tu reserva en Albergue Del Carrascalejo.",
        amount / 100
    )
}

#[allow(dead_code)]
pub fn create_reminder_template(guest_name: &str, days_until: i32) -> String {
    format!(
        "Hola {guest_name}, te recordamos que tu estancia en el Albergue Del Carrascalejo es en {days_until} días."
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_booking_template_contains_guest_name() {
        let result = create_booking_template("Juan", "BK-001", "2026-06-01", "2026-06-02");
        assert!(result.contains("Juan"));
        assert!(result.contains("BK-001"));
        assert!(result.contains("2026-06-01"));
        assert!(result.contains("2026-06-02"));
    }

    #[test]
    fn test_create_payment_template_formats_amount() {
        let result = create_payment_template(1250, "card");
        assert!(result.contains("12"));
        assert!(result.contains("card"));
        assert!(result.contains("Albergue Del Carrascalejo"));
    }

    #[test]
    fn test_create_payment_template_zero_amount() {
        let result = create_payment_template(0, "cash");
        assert!(result.contains('0'));
        assert!(result.contains("cash"));
    }

    #[test]
    fn test_create_reminder_template_content() {
        let result = create_reminder_template("Maria", 3);
        assert!(result.contains("Maria"));
        assert!(result.contains('3'));
        assert!(result.contains("Albergue Del Carrascalejo"));
    }

    #[test]
    fn test_create_reminder_template_one_day() {
        let result = create_reminder_template("Pedro", 1);
        assert!(result.contains('1'));
    }

    #[tokio::test]
    async fn test_notification_service_new() {
        let service = NotificationService::new();
        // The service should be constructable without panic
        let _ = &service;
    }

    #[tokio::test]
    async fn test_send_with_fallback_email_channel() {
        let service = NotificationService::new();
        let n = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::Email,
            "admin@test.com".to_string(),
            "Alert message".to_string(),
        );
        let result = service
            .send_with_fallback(n, vec![NotificationChannel::Email])
            .await
            .unwrap();
        assert!(matches!(result.status, NotificationStatus::Sent));
        assert_eq!(result.channel, NotificationChannel::Email);
    }

    #[tokio::test]
    async fn test_send_with_fallback_no_matching_channel() {
        let service = NotificationService::new();
        let n = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::Email,
            "admin@test.com".to_string(),
            "Alert message".to_string(),
        );
        // Pass only SMS channel - email adapter won't be tried
        let result = service
            .send_with_fallback(n, vec![NotificationChannel::SMS])
            .await
            .unwrap();
        assert!(matches!(result.status, NotificationStatus::Failed));
    }

    #[tokio::test]
    async fn test_send_with_fallback_empty_channels() {
        let service = NotificationService::new();
        let n = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::Email,
            "admin@test.com".to_string(),
            "Alert".to_string(),
        );
        let result = service.send_with_fallback(n, vec![]).await.unwrap();
        assert!(matches!(result.status, NotificationStatus::Failed));
    }

    #[tokio::test]
    async fn test_send_bulk_single() {
        let service = NotificationService::new();
        let n = Notification::new(
            NotificationType::ReservationCreated,
            NotificationChannel::Email,
            "guest@example.com".to_string(),
            "Welcome".to_string(),
        );
        let results = service.send_bulk(vec![n]).await.unwrap();
        assert_eq!(results.len(), 1);
        assert!(matches!(results[0].status, NotificationStatus::Sent));
    }

    #[tokio::test]
    async fn test_send_bulk_multiple() {
        let service = NotificationService::new();
        let notifications: Vec<Notification> = (0..3)
            .map(|i| {
                Notification::new(
                    NotificationType::CheckInReminder,
                    NotificationChannel::Email,
                    format!("guest{i}@example.com"),
                    format!("Reminder {i}"),
                )
            })
            .collect();
        let results = service.send_bulk(notifications).await.unwrap();
        assert_eq!(results.len(), 3);
    }

    #[tokio::test]
    async fn test_send_bulk_empty() {
        let service = NotificationService::new();
        let results = service.send_bulk(vec![]).await.unwrap();
        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_send_booking_confirmation() {
        let service = NotificationService::new();
        let results = service
            .send_booking_confirmation("pilgrim@test.com", None, "Bed 5, Room A")
            .await
            .unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].recipient, "pilgrim@test.com");
        assert!(results[0].message.contains("Bed 5, Room A"));
        assert_eq!(
            results[0].subject,
            Some("Booking Confirmation - Albergue Del Carrascalejo".to_string())
        );
    }

    #[tokio::test]
    async fn test_send_booking_confirmation_with_phone() {
        let service = NotificationService::new();
        let results = service
            .send_booking_confirmation("p@test.com", Some("+34600111222"), "Details")
            .await
            .unwrap();
        // Phone is currently unused but should not cause an error
        assert_eq!(results.len(), 1);
    }
}
