use crate::events::{topics, CloudEvent};
use anyhow::Result;
use serde_json::Value;

pub trait EventHandler: Send + Sync {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()>;

    fn topic_filters(&self) -> Vec<String>;
}

#[tracing::instrument(skip(body))]
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
#[tracing::instrument]
pub async fn register_webhook(
    service_id: &str,
    webhook_url: &str,
    topic_filters: &[String],
) -> Result<()> {
    tracing::info!(
        "Register webhook: service={service_id} url={webhook_url} filters={topic_filters:?}"
    );
    Ok(())
}

pub struct NotificationEventHandler;

impl EventHandler for NotificationEventHandler {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()> {
        match event.event_type.as_str() {
            topics::BOOKING_RESERVED => {
                tracing::info!("Handling BookingReserved event: {:?}", event.data);
                Ok(())
            }
            topics::BOOKING_CONFIRMED => {
                tracing::info!("Handling BookingConfirmed event: {:?}", event.data);
                Ok(())
            }
            topics::BOOKING_CANCELLED => {
                tracing::info!("Handling BookingCancelled event: {:?}", event.data);
                Ok(())
            }
            topics::PAYMENT_COMPLETED => {
                tracing::info!("Handling PaymentCompleted event: {:?}", event.data);
                Ok(())
            }
            _ => {
                tracing::debug!("Unhandled event type: {}", event.event_type);
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
        tracing::info!(
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
    fn test_matches_topic_wildcard_suffix() {
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
    }

    #[test]
    fn test_matches_topic_global_wildcard() {
        assert!(matches_topic("albergue.v1.anything", "*"));
        assert!(matches_topic("some.random.topic", "*"));
    }

    #[test]
    fn test_matches_topic_exact() {
        assert!(matches_topic(
            "albergue.v1.booking.reserved",
            "albergue.v1.booking.reserved"
        ));
        assert!(!matches_topic(
            "albergue.v1.booking.confirmed",
            "albergue.v1.booking.reserved"
        ));
    }

    #[test]
    fn test_matches_topic_no_match() {
        assert!(!matches_topic(
            "albergue.v1.payment.recorded",
            "albergue.v1.booking.reserved"
        ));
        assert!(!matches_topic("something", "other"));
    }

    #[test]
    fn test_parse_cloud_event_valid() {
        let event = CloudEvent::new(
            "albergue.v1.test.event".to_string(),
            "test-source".to_string(),
            serde_json::json!({"key": "value"}),
        );
        let bytes = serde_json::to_vec(&event).unwrap();
        let parsed = parse_cloud_event(&bytes).unwrap();
        assert_eq!(parsed.event_type, "albergue.v1.test.event");
        assert_eq!(parsed.source, "test-source");
    }

    #[test]
    fn test_parse_cloud_event_invalid() {
        let result = parse_cloud_event(b"not json");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_cloud_event_empty() {
        let result = parse_cloud_event(b"");
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_register_webhook() {
        let filters = vec!["albergue.v1.booking.*".to_string()];
        let result =
            register_webhook("test-service", "https://example.com/webhook", &filters).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_notification_event_handler_topic_filters() {
        let handler = NotificationEventHandler;
        let filters = handler.topic_filters();
        assert_eq!(filters.len(), 3);
        assert!(filters.contains(&"albergue.v1.booking.*".to_string()));
        assert!(filters.contains(&"albergue.v1.payment.*".to_string()));
        assert!(filters.contains(&"albergue.v1.pilgrim.registered".to_string()));
    }

    #[test]
    fn test_notification_handler_booking_reserved() {
        let handler = NotificationEventHandler;
        let event = CloudEvent::new(
            topics::BOOKING_RESERVED.to_string(),
            "test".to_string(),
            serde_json::json!({"booking_id": "123"}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }

    #[test]
    fn test_notification_handler_booking_confirmed() {
        let handler = NotificationEventHandler;
        let event = CloudEvent::new(
            topics::BOOKING_CONFIRMED.to_string(),
            "test".to_string(),
            serde_json::json!({"booking_id": "123"}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }

    #[test]
    fn test_notification_handler_booking_cancelled() {
        let handler = NotificationEventHandler;
        let event = CloudEvent::new(
            topics::BOOKING_CANCELLED.to_string(),
            "test".to_string(),
            serde_json::json!({"booking_id": "123"}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }

    #[test]
    fn test_notification_handler_payment_completed() {
        let handler = NotificationEventHandler;
        let event = CloudEvent::new(
            topics::PAYMENT_COMPLETED.to_string(),
            "test".to_string(),
            serde_json::json!({"payment_id": "456"}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }

    #[test]
    fn test_notification_handler_unhandled_event() {
        let handler = NotificationEventHandler;
        let event = CloudEvent::new(
            "albergue.v1.unknown.event".to_string(),
            "test".to_string(),
            serde_json::json!({}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }

    #[test]
    fn test_security_event_handler_topic_filters() {
        let handler = SecurityEventHandler;
        let filters = handler.topic_filters();
        assert_eq!(filters, vec!["*".to_string()]);
    }

    #[test]
    fn test_security_event_handler_handles_any_event() {
        let handler = SecurityEventHandler;
        let event = CloudEvent::new(
            "albergue.v1.booking.reserved".to_string(),
            "booking-service".to_string(),
            serde_json::json!({"data": "test"}),
        );
        assert!(handler.handle_event(&event).is_ok());
    }
}
