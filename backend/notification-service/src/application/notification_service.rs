use crate::domain::notification::{Notification, NotificationChannel, NotificationStatus, NotificationType};
use crate::ports::{email_port::EmailPort, sms_port::SmsPort, telegram_port::TelegramPort};
use anyhow::Result;
use futures::future::try_join_all;
use std::sync::Arc;
use tokio::task;

pub struct NotificationService {
    email_adapter: Arc<dyn EmailPort + Send + Sync>,
    sms_adapter: Arc<dyn SmsPort + Send + Sync>,
    telegram_adapter: Arc<dyn TelegramPort + Send + Sync>,
}

impl NotificationService {
    pub fn new() -> Self {
        use crate::adapters::email::nodemailer::NodemailerAdapter;
        use crate::adapters::sms::whatsapp::WhatsAppAdapter;
        use crate::adapters::telegram::telegraf::TelegrafAdapter;
        use std::sync::Arc;

        let email_adapter = Arc::new(NodemailerAdapter::new());
        let sms_adapter = Arc::new(WhatsAppAdapter::new());
        let telegram_adapter = Arc::new(TelegrafAdapter::new());

        Self {
            email_adapter,
            sms_adapter,
            telegram_adapter,
        }
    }

    // Async function to send notification through single channel
    async fn send_single_channel(
        &self,
        notification: &Notification,
        channel: NotificationChannel,
    ) -> Result<NotificationStatus> {
        match channel {
            NotificationChannel::Email => {
                self.email_adapter
                    .send_email(notification)
                    .await
            }
            NotificationChannel::SMS => {
                self.sms_adapter
                    .send_sms(notification)
                    .await
            }
            NotificationChannel::WhatsApp => {
                self.sms_adapter
                    .send_whatsapp(notification)
                    .await
            }
            NotificationChannel::Telegram => {
                self.telegram_adapter
                    .send_telegram(notification)
                    .await
            }
        }
        .map(|_| NotificationStatus::Sent)
        .map_err(|e| e.into())
    }

    // Async function to send notification with fallback channels
    pub async fn send_with_fallback(
        &self,
        mut notification: Notification,
        channels: Vec<NotificationChannel>,
    ) -> Result<Notification> {
        for channel in channels {
            // We need to clone notification or update its channel before sending?
            // Adapters take &Notification.
            // But we want to track which channel was used.
            // We can update notification.channel before sending if needed, but adapters might ignore it.
            // The logic here is trying to send.
            
            let status = match self.send_single_channel(&notification, channel.clone()).await {
                Ok(_) => NotificationStatus::Sent,
                Err(_) => NotificationStatus::Failed,
            };

            match status {
                NotificationStatus::Sent => {
                    notification.status = NotificationStatus::Sent;
                    notification.channel = channel;
                    return Ok(notification);
                }
                NotificationStatus::Failed => {
                    // Continue to next channel
                    continue;
                }
                _ => {
                    notification.status = status;
                    notification.channel = channel;
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
                        NotificationChannel::SMS,
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
    pub async fn send_booking_confirmation(
        &self,
        guest_email: &str,
        guest_phone: Option<&str>,
        booking_details: &str,
    ) -> Result<Vec<Notification>> {
        let mut notifications = Vec::new();

        // Email notification
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
        notifications.push(email_notification);

        // SMS notification if phone provided
        if let Some(phone) = guest_phone {
            let sms_notification = Notification {
                id: uuid::Uuid::new_v4(),
                notification_type: NotificationType::ReservationCreated,
                recipient: phone.to_string(),
                subject: Some("Booking Confirmed".to_string()),
                message: format!(
                    "Booking confirmed at Albergue Del Carrascalejo. {}",
                    booking_details
                ),
                channel: NotificationChannel::SMS,
                template_data: std::collections::HashMap::new(),
                status: NotificationStatus::Pending,
                created_at: chrono::Utc::now(),
                sent_at: None,
                delivered_at: None,
                error_message: None,
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
            .partition(|n| {
                n.subject.as_ref().map(|s| s.contains("URGENT") || s.contains("EMERGENCY")).unwrap_or(false)
            });

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
