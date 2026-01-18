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

    pub async fn publish<T: Serialize>(&self, event: &CloudEvent<T>) -> AlbergueResult<()> {
        let topic = &event.event_type;

        let payload = serde_json::to_string(event).map_err(|e| AlbergueError::Internal {
            message: e.to_string(),
        })?;

        let publish_url = format!("{}/api/mqtt/publish", self.broker_url);

        #[cfg(target_arch = "wasm32")]
        {
            use spin_sdk::http::{Method, Request, Response};

            let body = serde_json::json!({
                "topic": topic,
                "payload": payload,
                "qos": 0,
                "retain": false
            });

            let request = Request::builder()
                .method(Method::Post)
                .uri(&publish_url)
                .header("Content-Type", "application/json")
                .body(serde_json::to_vec(&body).unwrap_or_default())
                .build();

            let _ = spin_sdk::http::send::<_, Response>(request).await;
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            log::debug!("Would publish event to {publish_url}: topic={topic} payload={payload}");
        }

        Ok(())
    }

    pub async fn publish_batch<T: Serialize>(&self, events: &[CloudEvent<T>]) -> AlbergueResult<()> {
        for event in events {
            let _ = self.publish(event).await;
        }
        Ok(())
    }
}

#[must_use]
pub fn create_publisher() -> EventPublisher {
    EventPublisher::new("http://mqtt-broker-service.spin.internal".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_publisher() {
        let publisher = create_publisher();
        assert_eq!(
            publisher.broker_url,
            "http://mqtt-broker-service.spin.internal"
        );
    }
}
