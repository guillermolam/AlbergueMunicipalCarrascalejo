use crate::events::{topics, CloudEvent};
use anyhow::Result;
use serde_json::Value;

pub trait EventHandler: Send + Sync {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()>;

    fn topic_filters(&self) -> Vec<String>;
}

pub fn parse_cloud_event(body: &[u8]) -> Result<CloudEvent<Value>> {
    serde_json::from_slice(body).map_err(|e| anyhow::anyhow!("Failed to parse CloudEvent: {e}"))
}

#[must_use]
pub fn matches_topic(event_type: &str, filter: &str) -> bool {
    filter.strip_suffix(".*").map_or_else(
        || filter == "*" || event_type == filter,
        |prefix| event_type.starts_with(prefix),
    )
}

/// Register a webhook with the MQTT broker service.
///
/// In production Cloudflare Workers, service-to-service calls should use
/// Worker service bindings configured in `wrangler.toml`. This function
/// logs the registration intent; actual HTTP calls are handled at the
/// individual worker handler level where `Env` is available.
#[allow(clippy::unused_async)]
pub async fn register_webhook(
    service_id: &str,
    webhook_url: &str,
    topic_filters: &[String],
) -> Result<()> {
    log::info!(
        "Register webhook: service={service_id} url={webhook_url} filters={topic_filters:?}"
    );
    Ok(())
}

pub struct NotificationEventHandler;

impl EventHandler for NotificationEventHandler {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()> {
        match event.event_type.as_str() {
            topics::BOOKING_RESERVED => {
                log::info!("Handling BookingReserved event: {:?}", event.data);
                Ok(())
            }
            topics::BOOKING_CONFIRMED => {
                log::info!("Handling BookingConfirmed event: {:?}", event.data);
                Ok(())
            }
            topics::BOOKING_CANCELLED => {
                log::info!("Handling BookingCancelled event: {:?}", event.data);
                Ok(())
            }
            topics::PAYMENT_COMPLETED => {
                log::info!("Handling PaymentCompleted event: {:?}", event.data);
                Ok(())
            }
            _ => {
                log::debug!("Unhandled event type: {}", event.event_type);
                Ok(())
            }
        }
    }

    fn topic_filters(&self) -> Vec<String> {
        vec![
            "albergue.v1.booking.*".to_string(),
            "albergue.v1.payment.*".to_string(),
            "albergue.v1.pilgrim.registered".to_string(),
        ]
    }
}

pub struct SecurityEventHandler;

impl EventHandler for SecurityEventHandler {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()> {
        log::info!(
            "Audit logging event: {} from {}",
            event.event_type,
            event.source
        );
        Ok(())
    }

    fn topic_filters(&self) -> Vec<String> {
        vec!["*".to_string()]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_topic() {
        assert!(matches_topic(
            "albergue.v1.booking.reserved",
            "albergue.v1.booking.*"
        ));
        assert!(matches_topic(
            "albergue.v1.booking.confirmed",
            "albergue.v1.booking.*"
        ));
        assert!(!matches_topic(
            "albergue.v1.payment.recorded",
            "albergue.v1.booking.*"
        ));
        assert!(matches_topic("albergue.v1.anything", "*"));
        assert!(matches_topic(
            "albergue.v1.booking.reserved",
            "albergue.v1.booking.reserved"
        ));
    }
}
