use shared::AlbergueResult;

pub struct NotificationServer {
    port: u16,
}

impl NotificationServer {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn run(self) -> AlbergueResult<()> {
        Ok(())
    }
}

pub async fn create_server() -> AlbergueResult<NotificationServer> {
    Ok(NotificationServer::new(8080))
}