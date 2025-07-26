use crate::domain::*;
use crate::ports::*;
use serde_json;
use shared::{AlbergueError, AlbergueResult};
use std::collections::HashMap;

pub struct NotificationServiceImpl {
    email_adapter: Box<dyn EmailPort>,
    sms_adapter: Box<dyn SmsPort>,
    telegram_adapter: Box<dyn TelegramPort>,
    template_engine: handlebars::Handlebars<'static>,
}

impl NotificationServiceImpl {
    pub fn new() -> Self {
        let mut template_engine = handlebars::Handlebars::new();

        // Register default templates
        Self::register_templates(&mut template_engine);

        Self {
            email_adapter: Box::new(crate::adapters::email::NodemailerAdapter::new()),
            sms_adapter: Box::new(crate::adapters::sms::TwilioAdapter::new()),
            telegram_adapter: Box::new(crate::adapters::telegram::TelegrafAdapter::new()),
            template_engine,
        }
    }

    fn register_templates(engine: &mut handlebars::Handlebars<'static>) {
        // Booking confirmation email template
        engine
            .register_template_string(
                "booking_confirmation_email",
                r#"
¡Hola {{pilgrim_name}}!

Su reserva en el Albergue del Carrascalejo ha sido confirmada.

Detalles de la reserva:
- ID de reserva: {{booking_id}}
- Fecha de entrada: {{check_in_date}}
- Fecha de salida: {{check_out_date}}
- Habitación: {{room_type}} - Cama {{bed_number}}
- Importe total: {{total_amount}}€

¡Esperamos su llegada! El Camino le está esperando.

Albergue del Carrascalejo
"#,
            )
            .unwrap();

        // Payment receipt template
        engine
            .register_template_string(
                "payment_receipt_email",
                r#"
Estimado/a peregrino/a,

Su pago ha sido procesado correctamente.

Detalles del pago:
- ID de transacción: {{transaction_id}}
- Importe: {{amount}} {{currency}}
- Método de pago: {{payment_method}}
- Fecha: {{payment_date}}

{{#if receipt_url}}
Puede descargar su recibo desde: {{receipt_url}}
{{/if}}

¡Buen Camino!

Albergue del Carrascalejo
"#,
            )
            .unwrap();

        // WhatsApp booking confirmation
        engine.register_template_string(
            "booking_confirmation_whatsapp",
            "🏠 Reserva confirmada en Albergue del Carrascalejo\n📅 {{check_in_date}} - {{check_out_date}}\n🛏️ {{room_type}} - Cama {{bed_number}}\n💰 {{total_amount}}€\n\n¡Buen Camino! 🚶‍♂️",
        ).unwrap();
    }

    pub async fn send_email(
        &self,
        recipient: &str,
        subject: &str,
        content: &str,
    ) -> AlbergueResult<String> {
        let notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::Email,
            recipient.to_string(),
            content.to_string(),
        )
        .with_subject(subject.to_string());

        self.email_adapter.send_email(&notification).await
    }

    pub async fn send_sms(&self, recipient: &str, message: &str) -> AlbergueResult<String> {
        let notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::SMS,
            recipient.to_string(),
            message.to_string(),
        );

        self.sms_adapter.send_sms(&notification).await
    }

    pub async fn send_whatsapp(&self, recipient: &str, message: &str) -> AlbergueResult<String> {
        let notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::WhatsApp,
            recipient.to_string(),
            message.to_string(),
        );

        self.sms_adapter.send_whatsapp(&notification).await
    }

    pub async fn send_telegram(&self, chat_id: &str, message: &str) -> AlbergueResult<String> {
        let notification = Notification::new(
            NotificationType::AdminAlert,
            NotificationChannel::Telegram,
            chat_id.to_string(),
            message.to_string(),
        );

        self.telegram_adapter.send_telegram(&notification).await
    }

    pub async fn send_booking_confirmation(&self, booking_data: &str) -> AlbergueResult<String> {
        let data: BookingNotificationData = serde_json::from_str(booking_data)
            .map_err(|e| AlbergueError::ValidationError(format!("Invalid booking data: {}", e)))?;

        // Prepare template data
        let mut template_data = HashMap::new();
        template_data.insert("pilgrim_name".to_string(), data.pilgrim_name.clone());
        template_data.insert("booking_id".to_string(), data.booking_id.clone());
        template_data.insert("check_in_date".to_string(), data.check_in_date.clone());
        template_data.insert("check_out_date".to_string(), data.check_out_date.clone());
        template_data.insert("bed_number".to_string(), data.bed_number.to_string());
        template_data.insert("room_type".to_string(), data.room_type.clone());
        template_data.insert("total_amount".to_string(), data.total_amount.to_string());

        // Send email
        let email_content = self
            .template_engine
            .render("booking_confirmation_email", &template_data)
            .map_err(|e| AlbergueError::ValidationError(format!("Template error: {}", e)))?;

        let email_notification = Notification::new(
            NotificationType::ReservationCreated,
            NotificationChannel::Email,
            data.pilgrim_email.clone(),
            email_content,
        )
        .with_subject("Reserva confirmada - Albergue del Carrascalejo".to_string())
        .with_template_data(template_data.clone());

        let email_result = self.email_adapter.send_email(&email_notification).await?;

        // Send WhatsApp if phone available
        if let Some(phone) = data.pilgrim_phone {
            let whatsapp_content = self
                .template_engine
                .render("booking_confirmation_whatsapp", &template_data)
                .map_err(|e| AlbergueError::ValidationError(format!("Template error: {}", e)))?;

            let whatsapp_notification = Notification::new(
                NotificationType::ReservationCreated,
                NotificationChannel::WhatsApp,
                phone,
                whatsapp_content,
            )
            .with_template_data(template_data);

            // Try WhatsApp, fallback to SMS
            match self.sms_adapter.send_whatsapp(&whatsapp_notification).await {
                Ok(_) => {}
                Err(_) => {
                    let _ = self.sms_adapter.send_sms(&whatsapp_notification).await;
                }
            }
        }

        Ok(email_result)
    }

    pub async fn send_payment_receipt(&self, payment_data: &str) -> AlbergueResult<String> {
        let data: PaymentNotificationData = serde_json::from_str(payment_data)
            .map_err(|e| AlbergueError::ValidationError(format!("Invalid payment data: {}", e)))?;

        let mut template_data = HashMap::new();
        template_data.insert("booking_id".to_string(), data.booking_id.clone());
        template_data.insert("transaction_id".to_string(), data.transaction_id.clone());
        template_data.insert("amount".to_string(), data.amount.to_string());
        template_data.insert("currency".to_string(), data.currency.clone());
        template_data.insert("payment_method".to_string(), data.payment_method.clone());
        template_data.insert(
            "payment_date".to_string(),
            chrono::Utc::now().format("%Y-%m-%d %H:%M").to_string(),
        );

        if let Some(receipt_url) = &data.receipt_url {
            template_data.insert("receipt_url".to_string(), receipt_url.clone());
        }

        let email_content = self
            .template_engine
            .render("payment_receipt_email", &template_data)
            .map_err(|e| AlbergueError::ValidationError(format!("Template error: {}", e)))?;

        // This would need to get the recipient email from the booking service
        // For now, we'll return a success message
        Ok(format!(
            "Payment receipt prepared for booking {}",
            data.booking_id
        ))
    }
}
