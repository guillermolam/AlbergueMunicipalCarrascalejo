use shared::AlbergueResult;

pub fn init_logging() {
    tracing_subscriber::fmt()
        .with_env_filter(std::env::var("RUST_LOG").unwrap_or_else(|_| "info".to_string()))
        .init();
}

pub struct NotificationConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_user: String,
    pub smtp_password: String,
    pub from_email: String,
    pub twilio_account_sid: String,
    pub twilio_auth_token: String,
    pub twilio_phone_number: String,
    pub twilio_whatsapp_number: String,
    pub telegram_bot_token: String,
    pub telegram_chat_id: String,
}

impl NotificationConfig {
    pub fn from_env() -> AlbergueResult<Self> {
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
            twilio_account_sid: std::env::var("TWILIO_ACCOUNT_SID").unwrap_or_default(),
            twilio_auth_token: std::env::var("TWILIO_AUTH_TOKEN").unwrap_or_default(),
            twilio_phone_number: std::env::var("TWILIO_PHONE_NUMBER").unwrap_or_default(),
            twilio_whatsapp_number: std::env::var("TWILIO_WHATSAPP_NUMBER").unwrap_or_default(),
            telegram_bot_token: std::env::var("TELEGRAM_BOT_TOKEN").unwrap_or_default(),
            telegram_chat_id: std::env::var("TELEGRAM_CHAT_ID").unwrap_or_default(),
        })
    }
}
