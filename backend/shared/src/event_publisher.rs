// Event publisher for domain events
// Fire-and-forget HTTP client for mqtt-broker-service

use crate::events::CloudEvent;
use crate::error::{AlbergueError, AlbergueResult};
use serde::Serialize;

/// Event publisher client for mqtt-broker-service
pub struct EventPublisher {
    broker_url: String,
}

impl EventPublisher {
    /// Create a new event publisher
    /// broker_url should be "http://mqtt-broker-service.spin.internal" for internal routing
    pub fn new(broker_url: String) -> Self {
        Self { broker_url }
    }
    
    /// Publish a CloudEvent to the broker (fire-and-forget)
    /// Returns Ok(()) immediately without waiting for broker response
    pub fn publish<T: Serialize>(&self, event: &CloudEvent<T>) -> Result<()> {
        let topic = &event.event_type;
        
        // Serialize event to JSON
        let payload = serde_json::to_string(event)
            .map_err(|e| AlbergueError::Internal { message: e.to_string() })?;
        
        // Prepare publish request
        let publish_url = format!("{}/api/mqtt/publish", self.broker_url);
        let body = serde_json::json!({
            "topic": topic,
            "payload": payload,
            "qos": 0,
            "retain": false
        });
        
        // Fire-and-forget: send request without waiting for response
        // In production, consider using spin_sdk::http::send with error logging
        #[cfg(target_arch = "wasm32")]
        {
            use spin_sdk::http::{Request, Method};
            
            let request = Request::builder()
                .method(Method::Post)
                .uri(&publish_url)
                .header("Content-Type", "application/json")
                .body(serde_json::to_vec(&body).unwrap_or_default())
                .build();
            
            // Fire and forget - ignore result
            let _ = spin_sdk::http::send(request);
        }
        
        #[cfg(not(target_arch = "wasm32"))]
        {
            // For testing outside WASM environment
            log::debug!("Would publish event to {}: {}", publish_url, payload);
        }
        
        Ok(())
    }
    
    /// Publish multiple events in batch (fire-and-forget)
    pub fn publish_batch<T: Serialize>(&self, events: &[CloudEvent<T>]) -> Result<()> {
        for event in events {
            // Ignore individual errors in fire-and-forget mode
            let _ = self.publish(event);
        }
        Ok(())
    }
}

/// Helper function to create event publisher with default internal URL
pub fn create_publisher() -> EventPublisher {
    EventPublisher::new("http://mqtt-broker-service.spin.internal".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::{BookingReserved, topics};
    use chrono::Utc;
    
    #[test]
    fn test_create_publisher() {
        let publisher = create_publisher();
        assert_eq!(publisher.broker_url, "http://mqtt-broker-service.spin.internal");
    }
    
    #[test]
    fn test_publish_serialization() {
        let publisher = EventPublisher::new("http://test.internal".to_string());
        
        let event = CloudEvent::new(
            topics::BOOKING_RESERVED.to_string(),
            "booking-service".to_string(),
            BookingReserved {
                booking_id: "booking-123".to_string(),
                pilgrim_id: "pilgrim-456".to_string(),
                check_in_date: "2026-01-15".to_string(),
                check_out_date: "2026-01-16".to_string(),
                nights: 1,
                total_amount: 25.0,
                expires_at: Utc::now(),
            },
        );
        
        // Should not panic
        let result = publisher.publish(&event);
        assert!(result.is_ok());
    }
}
