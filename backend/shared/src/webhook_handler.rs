// Webhook event handlers for domain events
// Provides utilities for services to receive and process CloudEvents via webhooks

use crate::events::{topics, CloudEvent};
use anyhow::Result;
use serde_json::Value;

/// Webhook event handler trait
pub trait EventHandler: Send + Sync {
    /// Handle an incoming event
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()>;

    /// Get the topic filters this handler subscribes to
    fn topic_filters(&self) -> Vec<String>;
}

/// Parse CloudEvent from webhook request body
pub fn parse_cloud_event(body: &[u8]) -> Result<CloudEvent<Value>> {
    serde_json::from_slice(body).map_err(|e| anyhow::anyhow!("Failed to parse CloudEvent: {}", e))
}

/// Check if event matches topic filter
pub fn matches_topic(event_type: &str, filter: &str) -> bool {
    if filter.ends_with(".*") {
        let prefix = &filter[..filter.len() - 2];
        event_type.starts_with(prefix)
    } else if filter == "*" {
        true
    } else {
        event_type == filter
    }
}

/// Register webhook with mqtt-broker-service
pub fn register_webhook(
    service_id: &str,
    webhook_url: &str,
    topic_filters: Vec<String>,
) -> Result<()> {
    #[cfg(target_arch = "wasm32")]
    {
        use spin_sdk::http::{Method, Request};

        let registration = serde_json::json!({
            "service_id": service_id,
            "webhook_url": webhook_url,
            "topic_filters": topic_filters
        });

        let broker_url = "http://mqtt-broker-service.spin.internal/api/mqtt/register-webhook";

        let request = Request::builder()
            .method(Method::Post)
            .uri(broker_url)
            .header("Content-Type", "application/json")
            .body(serde_json::to_vec(&registration)?)
            .build();

        // Send registration request
        let response = spin_sdk::http::send(request)?;

        if response.status() == 200 {
            log::info!(
                "Registered webhook for {} with filters: {:?}",
                service_id,
                topic_filters
            );
            Ok(())
        } else {
            Err(anyhow::anyhow!(
                "Failed to register webhook: status {}",
                response.status()
            ))
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    {
        log::debug!(
            "Would register webhook for {} with filters: {:?}",
            service_id,
            topic_filters
        );
        Ok(())
    }
}

/// Example event handler implementation for notification service
pub struct NotificationEventHandler;

impl EventHandler for NotificationEventHandler {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()> {
        match event.event_type.as_str() {
            topics::BOOKING_RESERVED => {
                log::info!("Handling BookingReserved event: {:?}", event.data);
                // Send reservation confirmation notification
                Ok(())
            }
            topics::BOOKING_CONFIRMED => {
                log::info!("Handling BookingConfirmed event: {:?}", event.data);
                // Send booking confirmation notification
                Ok(())
            }
            topics::BOOKING_CANCELLED => {
                log::info!("Handling BookingCancelled event: {:?}", event.data);
                // Send cancellation notification
                Ok(())
            }
            topics::PAYMENT_COMPLETED => {
                log::info!("Handling PaymentCompleted event: {:?}", event.data);
                // Send payment receipt
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

/// Example event handler for security service (audit logging)
pub struct SecurityEventHandler;

impl EventHandler for SecurityEventHandler {
    fn handle_event(&self, event: &CloudEvent<Value>) -> Result<()> {
        log::info!(
            "Audit logging event: {} from {}",
            event.event_type,
            event.source
        );
        // Log all events to audit log
        Ok(())
    }

    fn topic_filters(&self) -> Vec<String> {
        vec!["*".to_string()] // Subscribe to all events
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
