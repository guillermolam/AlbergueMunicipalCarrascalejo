use shared::AlbergueResult;

#[allow(dead_code)]
pub struct NotificationServer {
    port: u16,
}

#[allow(dead_code)]
impl NotificationServer {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn run(self) -> AlbergueResult<()> {
        Ok(())
    }
}

#[allow(dead_code)]
pub async fn create_server() -> AlbergueResult<NotificationServer> {
    Ok(NotificationServer::new(8080))
}
