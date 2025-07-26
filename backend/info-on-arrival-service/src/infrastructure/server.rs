use shared::AlbergueResult;

pub struct InfoServer {
    port: u16,
}

impl InfoServer {
    pub fn new(port: u16) -> Self {
        Self { port }
    }

    pub async fn run(self) -> AlbergueResult<()> {
        tracing::info!("Info on arrival service starting on port {}", self.port);

        #[cfg(not(target_arch = "wasm32"))]
        {
            tracing::info!("Info service running in standalone mode");
            tokio::signal::ctrl_c().await.unwrap();
        }

        Ok(())
    }
}

pub async fn create_server() -> AlbergueResult<InfoServer> {
    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "8003".to_string())
        .parse()
        .unwrap_or(8003);

    Ok(InfoServer::new(port))
}
