use crate::domain::notification::{Notification, NotificationChannel, NotificationStatus};
use crate::ports::{email_port::EmailPort, sms_port::SmsPort, telegram_port::TelegramPort};
use anyhow::Result;
use tokio::task;
use futures::future::try_join_all;
use std::sync::Arc;

pub struct NotificationService {
    email_adapter: Arc<dyn EmailPort + Send + Sync>,
    sms_adapter: Arc<dyn SmsPort + Send + Sync>, 
    telegram_adapter: Arc<dyn TelegramPort + Send + Sync>,
}

impl NotificationService {
    pub fn new(
        email_adapter: Arc<dyn EmailPort + Send + Sync>,
        sms_adapter: Arc<dyn SmsPort + Send + Sync>,
        telegram_adapter: Arc<dyn TelegramPort + Send + Sync>,
    ) -> Self {
        Self {
            email_adapter,
            sms_adapter,
            telegram_adapter,
        }
    }

    // Async function to send notification through single channel
    async fn send_single_channel(&self, notification: &Notification, channel: NotificationChannel) -> Result<NotificationStatus> {
        match channel {
            NotificationChannel::Email => {
                self.email_adapter.send_email(&notification.recipient, &notification.subject, &notification.body).await
            }
            NotificationChannel::Sms => {
                self.sms_adapter.send_sms(&notification.recipient, &notification.body).await
            }
            NotificationChannel::WhatsApp => {
                self.sms_adapter.send_whatsapp(&notification.recipient, &notification.body).await
            }
            NotificationChannel::Telegram => {
                self.telegram_adapter.send_message(&notification.recipient, &notification.body).await
            }
        }
    }

    // Async function to send notification with fallback channels
    pub async fn send_with_fallback(&self, mut notification: Notification, channels: Vec<NotificationChannel>) -> Result<Notification> {
        for channel in channels {
            let status = self.send_single_channel(&notification, channel).await?;

            match status {
                NotificationStatus::Sent => {
                    notification.status = NotificationStatus::Sent;
                    notification.channel = Some(channel);
                    return Ok(notification);
                }
                NotificationStatus::Failed => {
                    // Continue to next channel
                    continue;
                }
                _ => {
                    notification.status = status;
                    notification.channel = Some(channel);
                }
            }
        }

        notification.status = NotificationStatus::Failed;
        Ok(notification)
    }

    // Async function to send multiple notifications concurrently
    pub async fn send_bulk(&self, notifications: Vec<Notification>) -> Result<Vec<Notification>> {
        // Create tasks for concurrent execution
        let tasks: Vec<_> = notifications
            .into_iter()
            .map(|notification| {
                let service = self.clone_service();
                task::spawn(async move {
                    // Default fallback order: WhatsApp -> SMS -> Email
                    let channels = vec![
                        NotificationChannel::WhatsApp,
                        NotificationChannel::Sms,
                        NotificationChannel::Email,
                    ];
                    service.send_with_fallback(notification, channels).await
                })
            })
            .collect();

        // Wait for all tasks to complete
        let mut results = Vec::new();
        for task in tasks {
            results.push(task.await??);
        }

        Ok(results)
    }

    // Async function to send booking confirmation with multiple channels
    pub async fn send_booking_confirmation(&self, guest_email: &str, guest_phone: Option<&str>, booking_details: &str) -> Result<Vec<Notification>> {
        let mut notifications = Vec::new();

        // Email notification
        let email_notification = Notification {
            id: uuid::Uuid::new_v4().to_string(),
            recipient: guest_email.to_string(),
            subject: "Booking Confirmation - Albergue Del Carrascalejo".to_string(),
            body: format!("Your booking has been confirmed. Details: {}", booking_details),
            channel: None,
            status: NotificationStatus::Pending,
            created_at: chrono::Utc::now(),
            sent_at: None,
        };
        notifications.push(email_notification);

        // SMS notification if phone provided
        if let Some(phone) = guest_phone {
            let sms_notification = Notification {
                id: uuid::Uuid::new_v4().to_string(),
                recipient: phone.to_string(),
                subject: "Booking Confirmed".to_string(),
                body: format!("Booking confirmed at Albergue Del Carrascalejo. {}", booking_details),
                channel: None,
                status: NotificationStatus::Pending,
                created_at: chrono::Utc::now(),
                sent_at: None,
            };
            notifications.push(sms_notification);
        }

        // Send all notifications concurrently
        self.send_bulk(notifications).await
    }

    // Helper method to clone the service for async tasks
    fn clone_service(&self) -> NotificationService {
        NotificationService {
            email_adapter: Arc::clone(&self.email_adapter),
            sms_adapter: Arc::clone(&self.sms_adapter),
            telegram_adapter: Arc::clone(&self.telegram_adapter),
        }
    }

    // Async function to process notification queue
    pub async fn process_queue(&self, queue: Vec<Notification>) -> Result<Vec<Notification>> {
        // Group notifications by priority/type for optimal processing
        let (urgent, normal): (Vec<_>, Vec<_>) = queue
            .into_iter()
            .partition(|n| n.subject.contains("URGENT") || n.subject.contains("EMERGENCY"));

        // Process urgent notifications first
        let urgent_results = if !urgent.is_empty() {
            self.send_bulk(urgent).await?
        } else {
            Vec::new()
        };

        // Process normal notifications
        let normal_results = if !normal.is_empty() {
            self.send_bulk(normal).await?
        } else {
            Vec::new()
        };

        // Combine results
        let mut all_results = urgent_results;
        all_results.extend(normal_results);

        Ok(all_results)
    }
}

// Stateless pure functions for notification templates
pub fn create_booking_template(guest_name: &str, booking_id: &str, check_in: &str, check_out: &str) -> String {
    format!(
        "Hola {}, tu reserva {} ha sido confirmada. Check-in: {}, Check-out: {}. ¡Te esperamos!",
        guest_name, booking_id, check_in, check_out
    )
}

pub fn create_payment_template(amount: i32, payment_method: &str) -> String {
    format!(
        "Pago recibido: {}€ via {}. Gracias por tu reserva en Albergue Del Carrascalejo.",
        amount / 100, payment_method
    )
}

pub fn create_reminder_template(guest_name: &str, days_until: i32) -> String {
    format!(
        "Hola {}, te recordamos que tu estancia en el Albergue Del Carrascalejo es en {} días.",
        guest_name, days_until
    )
}