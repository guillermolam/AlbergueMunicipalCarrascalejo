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
pub async fn register_webhook(
    service_id: &str,
    webhook_url: &str,
    topic_filters: &[String],
) -> Result<()> {
    #[cfg(target_arch = "wasm32")]
    {
        use spin_sdk::http::{Method, Request, Response};

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

        let response: Response = spin_sdk::http::send(request).await?;

        if *response.status() == 200 {
            log::info!("Registered webhook for {service_id} with filters: {topic_filters:?}");
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
            "Would register webhook for {service_id} -> {webhook_url} with filters: {topic_filters:?}"
        );
        Ok(())
    }
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
