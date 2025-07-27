use crate::domain::Notification;
use crate::ports::EmailPort;
use async_trait::async_trait;
use lettre::{
    message::{header::ContentType, Message},
    transport::smtp::{authentication::Credentials, response::Response},
    AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
};
use shared::{AlbergueError, AlbergueResult};

pub struct NodemailerAdapter {
    smtp_transport: AsyncSmtpTransport<Tokio1Executor>,
    from_email: String,
}

impl NodemailerAdapter {
    pub fn new() -> Self {
        let smtp_host =
            std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.resend.com".to_string());
        let smtp_port = std::env::var("SMTP_PORT")
            .unwrap_or_else(|_| "587".to_string())
            .parse::<u16>()
            .unwrap_or(587);
        let smtp_user = std::env::var("SMTP_USER").unwrap_or_else(|_| "resend".to_string());
        let smtp_password = std::env::var("SMTP_PASSWORD").unwrap_or_default();
        let from_email =
            std::env::var("FROM_EMAIL").unwrap_or_else(|_| "albergue@carrascalejo.com".to_string());

        let creds = Credentials::new(smtp_user, smtp_password);

        let transport = AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host)
            .unwrap()
            .port(smtp_port)
            .credentials(creds)
            .build();

        Self {
            smtp_transport: transport,
            from_email,
        }
    }
}

#[async_trait]
impl EmailPort for NodemailerAdapter {
    async fn send_email(&self, notification: &Notification) -> AlbergueResult<String> {
        let subject = notification
            .subject
            .as_ref()
            .unwrap_or(&"Notificación - Albergue del Carrascalejo".to_string());

        let email = Message::builder()
            .from(
                format!("Albergue del Carrascalejo <{}>", self.from_email)
                    .parse()
                    .map_err(|e| {
                        AlbergueError::ValidationError(format!("Invalid from email: {}", e))
                    })?,
            )
            .to(notification.recipient.parse().map_err(|e| {
                AlbergueError::ValidationError(format!("Invalid recipient email: {}", e))
            })?)
            .subject(subject)
            .header(ContentType::TEXT_PLAIN)
            .body(notification.message.clone())
            .map_err(|e| AlbergueError::ValidationError(format!("Failed to build email: {}", e)))?;

        match self.smtp_transport.send(email).await {
            Ok(response) => Ok(format!(
                "Email sent: {}",
                response.message().iter().next().unwrap_or(&"No message")
            )),
            Err(e) => Err(AlbergueError::ExternalServiceError(format!(
                "SMTP error: {}",
                e
            ))),
        }
    }

    async fn verify_smtp_connection(&self) -> AlbergueResult<bool> {
        match self.smtp_transport.test_connection().await {
            Ok(_) => Ok(true),
            Err(e) => {
                tracing::warn!("SMTP connection test failed: {}", e);
                Ok(false)
            }
        }
    }
}
