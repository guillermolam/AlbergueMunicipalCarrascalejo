use crate::domain::Notification;
use crate::ports::EmailPort;
use async_trait::async_trait;
use shared::{AlbergueError, AlbergueResult};

#[cfg(not(target_arch = "wasm32"))]
mod imp {
    use super::*;
    use lettre::{
        message::{header::ContentType, Message},
        transport::smtp::authentication::Credentials,
        AsyncSmtpTransport, AsyncTransport, Tokio1Executor,
    };

    pub struct NodemailerAdapter {
        smtp_transport: AsyncSmtpTransport<Tokio1Executor>,
        from_email: String,
    }

    impl NodemailerAdapter {
        #[must_use]
        pub fn new() -> Self {
            let smtp_host =
                std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.resend.com".to_string());
            let smtp_port = std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse::<u16>()
                .unwrap_or(587);
            let smtp_user = std::env::var("SMTP_USER").unwrap_or_else(|_| "resend".to_string());
            let smtp_password = std::env::var("SMTP_PASSWORD").unwrap_or_default();
            let from_email = std::env::var("FROM_EMAIL")
                .unwrap_or_else(|_| "albergue@carrascalejo.com".to_string());

            let creds = Credentials::new(smtp_user, smtp_password);

            let transport = AsyncSmtpTransport::<Tokio1Executor>::relay(&smtp_host)
                .unwrap_or_else(|_| AsyncSmtpTransport::<Tokio1Executor>::unencrypted_localhost())
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
                .as_deref()
                .unwrap_or("Notificación - Albergue del Carrascalejo");

            let email = Message::builder()
                .from(
                    format!("Albergue del Carrascalejo <{}>", self.from_email)
                        .parse()
                        .map_err(|e| AlbergueError::Validation {
                            message: format!("Invalid from email: {e}"),
                        })?,
                )
                .to(notification.recipient.parse().map_err(|e| AlbergueError::Validation {
                    message: format!("Invalid recipient email: {e}"),
                })?)
                .subject(subject)
                .header(ContentType::TEXT_PLAIN)
                .body(notification.message.clone())
                .map_err(|e| AlbergueError::Validation {
                    message: format!("Failed to build email: {e}"),
                })?;

            match self.smtp_transport.send(email).await {
                Ok(response) => Ok(format!(
                    "Email sent: {}",
                    response.message().next().unwrap_or("No message")
                )),
                Err(e) => Err(AlbergueError::ExternalService {
                    service: "smtp".to_string(),
                    message: format!("SMTP error: {e}"),
                }),
            }
        }

        async fn verify_smtp_connection(&self) -> AlbergueResult<bool> {
            match self.smtp_transport.test_connection().await {
                Ok(_) => Ok(true),
                Err(e) => {
                    tracing::warn!("SMTP connection test failed: {e}");
                    Ok(false)
                }
            }
        }
    }
}

#[cfg(target_arch = "wasm32")]
mod imp {
    use super::*;

    pub struct NodemailerAdapter;

    impl NodemailerAdapter {
        #[must_use]
        pub fn new() -> Self {
            Self
        }
    }

    #[async_trait]
    impl EmailPort for NodemailerAdapter {
        async fn send_email(&self, _notification: &Notification) -> AlbergueResult<String> {
            Err(AlbergueError::ExternalService {
                service: "smtp".to_string(),
                message: "SMTP not available in this WASM build".to_string(),
            })
        }

        async fn verify_smtp_connection(&self) -> AlbergueResult<bool> {
            Ok(false)
        }
    }
}

pub use imp::NodemailerAdapter;
