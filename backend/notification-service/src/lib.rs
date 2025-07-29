pub mod adapters;
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ports;

pub use application::notification_service::NotificationService;
pub use domain::notification::{Notification, NotificationChannel, NotificationStatus};

// Add Tokio runtime support for WASM
use std::sync::Once;
use tokio::runtime::Runtime;

static INIT: Once = Once::new();
static mut RUNTIME: Option<Runtime> = None;

pub fn get_runtime() -> &'static Runtime {
    unsafe {
        INIT.call_once(|| {
            RUNTIME = Some(Runtime::new().expect("Failed to create Tokio runtime"));
        });
        RUNTIME.as_ref().unwrap()
    }
}
