
pub mod domain;
pub mod application;
pub mod ports;
pub mod adapters;
pub mod infrastructure;

pub use application::notification_service::NotificationService;
pub use domain::notification::{Notification, NotificationChannel, NotificationStatus};

// Add Tokio runtime support for WASM
use tokio::runtime::Runtime;
use std::sync::Once;

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
