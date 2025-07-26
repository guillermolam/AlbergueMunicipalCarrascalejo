use shared::AlbergueResult;

pub struct NotificationServer {
    port: u16,
}

impl NotificationServer {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn run(self) -> AlbergueResult<()> {
        tracing::info!("Notification service starting on port {}", self.port);

        // For WASM deployment, this would be handled by the Spin framework
        // In standalone mode, this would set up an HTTP server

        #[cfg(not(target_arch = "wasm32"))]
        {
            // Standalone server implementation would go here
            // For now, just log and return
            tracing::info!("Notification service running in standalone mode");
            tokio::signal::ctrl_c().await.unwrap();
        }

        Ok(())
    }
}

pub async fn create_server() -> AlbergueResult<NotificationServer> {
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8002".to_string())
        .parse()
        .unwrap_or(8002);

    Ok(NotificationServer::new(port))
}
