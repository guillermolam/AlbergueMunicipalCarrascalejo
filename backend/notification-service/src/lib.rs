pub mod domain;
pub mod application;
pub mod ports;
pub mod adapters;
pub mod infrastructure;

pub use application::notification_service::NotificationService;
pub use domain::notification::{Notification, NotificationChannel, NotificationStatus};