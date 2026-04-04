use crate::domain::notification::{Notification, NotificationChannel, NotificationStatus, NotificationType};
use crate::adapters::email::nodemailer::NodemailerAdapter;
use anyhow::Result;
use std::sync::Arc;

pub struct NotificationService {
    email_adapter: NodemailerAdapter,
}

impl NotificationService {
    pub fn new() -> Self {
        Self {
            email_adapter: NodemailerAdapter::new(),
        }
    }

    pub async fn send_with_fallback(
        &self,
        notification: Notification,
        channels: Vec<NotificationChannel>,
    ) -> Result<Notification> {
        let mut notification = notification;

        for channel in channels {
            if channel == NotificationChannel::Email {
                match self.email_adapter.send_email(&notification).await {
                    Ok((message_id, status)) => {
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

    pub async fn send_bulk(&self, notifications: Vec<Notification>) -> Result<Vec<Notification>> {
        let mut results = Vec::new();
        for notification in notifications {
            let result = self.send_with_fallback(notification, vec![NotificationChannel::Email]).await?;
            results.push(result);
        }
        Ok(results)
    }

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
            message: format!(
                "Your booking has been confirmed. Details: {}",
                booking_details
            ),
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

    pub async fn process_queue(&self, queue: Vec<Notification>) -> Result<Vec<Notification>> {
        self.send_bulk(queue).await
    }
}

pub fn create_booking_template(
    guest_name: &str,
    booking_id: &str,
    check_in: &str,
    check_out: &str,
) -> String {
    format!(
        "Hola {}, tu reserva {} ha sido confirmada. Check-in: {}, Check-out: {}. ¡Te esperamos!",
        guest_name, booking_id, check_in, check_out
    )
}

pub fn create_payment_template(amount: i32, payment_method: &str) -> String {
    format!(
        "Pago recibido: {}€ via {}. Gracias por tu reserva en Albergue Del Carrascalejo.",
        amount / 100,
        payment_method
    )
}

pub fn create_reminder_template(guest_name: &str, days_until: i32) -> String {
    format!(
        "Hola {}, te recordamos que tu estancia en el Albergue Del Carrascalejo es en {} días.",
        guest_name, days_until
    )
}
