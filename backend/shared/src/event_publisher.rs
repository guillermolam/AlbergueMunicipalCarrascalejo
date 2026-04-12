use crate::error::{AlbergueError, AlbergueResult};
use crate::events::CloudEvent;
use serde::Serialize;

pub struct EventPublisher {
    broker_url: String,
}

impl EventPublisher {
    #[must_use]
    pub fn new(broker_url: String) -> Self {
        Self { broker_url }
    }

    /// Publish a `CloudEvent` to the MQTT broker service via HTTP.
    ///
    /// In Cloudflare Workers (WASM), uses the Worker Fetch API.
    /// In native builds, logs the publish intent.
    #[allow(clippy::unused_async, clippy::future_not_send)]
    #[tracing::instrument(skip(self, event), fields(topic = %event.event_type))]
    pub async fn publish<T: Serialize>(&self, event: &CloudEvent<T>) -> AlbergueResult<()> {
        let topic = &event.event_type;

        let payload = serde_json::to_string(event).map_err(|e| AlbergueError::Internal {
            message: e.to_string(),
        })?;

        let publish_url = format!("{}/api/mqtt/publish", self.broker_url);

        #[cfg(target_arch = "wasm32")]
        {
            let body = serde_json::json!({
                "topic": topic,
                "payload": payload,
                "qos": 0,
                "retain": false
            });

            let body_str = serde_json::to_string(&body).map_err(|e| AlbergueError::Internal {
                message: e.to_string(),
            })?;

            let headers = worker::Headers::new();
            headers.set("Content-Type", "application/json").ok();

            let mut init = worker::RequestInit::new();
            init.with_method(worker::Method::Post)
                .with_headers(headers)
                .with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body_str)));

            match worker::Request::new_with_init(&publish_url, &init) {
                Ok(request) => match worker::Fetch::Request(request).send().await {
                    Ok(_) => tracing::info!("Published to {publish_url}: topic={topic}"),
                    Err(e) => tracing::warn!("Failed to publish to {publish_url}: {e}"),
                },
                Err(e) => tracing::warn!("Failed to create request for {publish_url}: {e}"),
            }
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            tracing::debug!(
                "Would publish event to {publish_url}: topic={topic} payload={payload}"
            );
        }

        Ok(())
    }

    #[allow(clippy::future_not_send)]
    #[tracing::instrument(skip(self, events), fields(count = events.len()))]
    pub async fn publish_batch<T: Serialize>(
        &self,
        events: &[CloudEvent<T>],
    ) -> AlbergueResult<()> {
        for event in events {
            let _ = self.publish(event).await;
        }
        Ok(())
    }
}

#[must_use]
pub fn create_publisher() -> EventPublisher {
    // For Cloudflare Workers, use the mqtt-broker-service worker URL
    EventPublisher::new("https://mqtt-broker-service.albergue.workers.dev".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_publisher() {
        let publisher = create_publisher();
        assert_eq!(
            publisher.broker_url,
            "https://mqtt-broker-service.albergue.workers.dev"
        );
    }

    #[test]
    fn test_new_publisher_custom_url() {
        let publisher = EventPublisher::new("https://custom.example.com".to_string());
        assert_eq!(publisher.broker_url, "https://custom.example.com");
    }

    #[tokio::test]
    async fn test_publish_single_event() {
        let publisher = EventPublisher::new("https://test.example.com".to_string());
        let event = CloudEvent::new(
            "albergue.v1.booking.reserved".to_string(),
            "test-service".to_string(),
            serde_json::json!({"booking_id": "123"}),
        );
        let result = publisher.publish(&event).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_publish_batch_empty() {
        let publisher = EventPublisher::new("https://test.example.com".to_string());
        let events: Vec<CloudEvent<serde_json::Value>> = vec![];
        let result = publisher.publish_batch(&events).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_publish_batch_multiple() {
        let publisher = EventPublisher::new("https://test.example.com".to_string());
        let events = vec![
            CloudEvent::new(
                "albergue.v1.booking.reserved".to_string(),
                "test-service".to_string(),
                serde_json::json!({"booking_id": "1"}),
            ),
            CloudEvent::new(
                "albergue.v1.booking.confirmed".to_string(),
                "test-service".to_string(),
                serde_json::json!({"booking_id": "2"}),
            ),
        ];
        let result = publisher.publish_batch(&events).await;
        assert!(result.is_ok());
    }
}
