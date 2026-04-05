use anyhow::Result;

#[allow(dead_code)]
pub struct NotificationConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub from_email: String,
}

#[allow(dead_code)]
impl NotificationConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_else(|_| "smtp.resend.com".to_string()),
            smtp_port: std::env::var("SMTP_PORT")
                .unwrap_or_else(|_| "587".to_string())
                .parse()
                .unwrap_or(587),
            smtp_user: std::env::var("SMTP_USER").unwrap_or_else(|_| "resend".to_string()),
            smtp_password: std::env::var("SMTP_PASSWORD").unwrap_or_default(),
            from_email: std::env::var("FROM_EMAIL")
                .unwrap_or_else(|_| "albergue@carrascalejo.com".to_string()),
        })
    }
}
