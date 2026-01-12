#![deny(warnings)]
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

pub mod adapters;
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ports;

pub use application::notification_service::NotificationService;
pub use domain::notification::{Notification, NotificationChannel, NotificationStatus};

// Add Tokio runtime support for WASM
use std::sync::OnceLock;
use tokio::runtime::Runtime;

static RUNTIME: OnceLock<Runtime> = OnceLock::new();

pub fn get_runtime() -> &'static Runtime {
    RUNTIME.get_or_init(|| Runtime::new().expect("Failed to create Tokio runtime"))
}
