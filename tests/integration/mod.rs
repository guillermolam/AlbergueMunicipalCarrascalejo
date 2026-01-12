
#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

//! Integration Tests Module
//!
//! Tests the complete service composition pipeline by making real HTTP requests
//! to the Spin gateway running in test mode.

pub mod gateway_integration_test;

// Re-export main test client for use in other test modules
pub use gateway_integration_test::GatewayTestClient;

#[cfg(test)]
mod test_runner {
    use super::*;
    use std::process::{Command, Stdio};
    use std::time::Duration;
    use tokio::time::sleep;

    /// Start Spin gateway in background for integration tests
    pub async fn start_test_gateway() -> std::process::Child {
        println!("🚀 Starting Spin gateway for integration tests...");

        let child = Command::new("spin")
            .args(&["up", "--listen", "0.0.0.0:3000"])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("Failed to start Spin gateway");

        // Wait for gateway to start
        sleep(Duration::from_secs(3)).await;

        child
    }

    /// Stop the test gateway
    pub fn stop_test_gateway(mut child: std::process::Child) {
        println!("🛑 Stopping test gateway...");
        let _ = child.kill();
        let _ = child.wait();
    }
}
