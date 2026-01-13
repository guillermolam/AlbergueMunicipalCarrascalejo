// Event interception middleware for API Gateway
// Extracts CloudEvents from service responses and publishes to mqtt-broker-service

use serde::Deserialize;
use spin_sdk::http::{Request, Response};

/// Response envelope that may contain events
#[derive(Debug, Deserialize)]
pub struct EventCarryingResponse<T> {
    pub data: T,
    #[serde(default)]
    pub events: Vec<serde_json::Value>,
}

/// Extract events from service response
/// Supports two patterns:
/// 1. X-CloudEvents header with JSON array
/// 2. Response body with {"data": {...}, "events": [...]}
pub fn extract_events_from_response(response: &Response) -> Vec<serde_json::Value> {
    let mut events = Vec::new();

    // Pattern 1: Check X-CloudEvents header
    if let Some((_, header_value)) = response
        .headers()
        .iter()
        .find(|(k, _)| k.as_str() == "x-cloudevents")
    {
        if let Ok(header_str) = std::str::from_utf8(header_value) {
            if let Ok(header_events) = serde_json::from_str::<Vec<serde_json::Value>>(header_str) {
                events.extend(header_events);
            }
        }
    }

    // Pattern 2: Check response body for event envelope
    if let Ok(body_str) = std::str::from_utf8(response.body()) {
        if let Ok(envelope) =
            serde_json::from_str::<EventCarryingResponse<serde_json::Value>>(body_str)
        {
            events.extend(envelope.events);
        }
    }

    events
}

/// Publish events to mqtt-broker-service (fire-and-forget)
pub fn publish_events_async(events: Vec<serde_json::Value>) {
    if events.is_empty() {
        return;
    }

    let broker_url = "http://mqtt-broker-service.spin.internal";

    for event in events {
        // Extract topic from event type
        let topic = event
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("albergue.v1.unknown");

        // Serialize full CloudEvent
        let payload = match serde_json::to_string(&event) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let publish_body = serde_json::json!({
            "topic": topic,
            "payload": payload,
            "qos": 0,
            "retain": false
        });

        let publish_url = format!("{}/api/mqtt/publish", broker_url);

        // Build request and fire-and-forget
        let request = Request::post(&publish_url)
            .header("Content-Type", "application/json")
            .body(serde_json::to_vec(&publish_body).unwrap_or_default())
            .build();

        let _ = spin_sdk::http::send(request);
    }
}

/// Middleware function to intercept response and publish events
pub fn intercept_and_publish_events(response: Response) -> Response {
    // Extract events from response
    let events = extract_events_from_response(&response);

    // Publish events asynchronously (fire-and-forget)
    if !events.is_empty() {
        publish_events_async(events);
    }

    // Return original response unchanged
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_events_from_header() {
        let events_json = r#"[{"type":"albergue.v1.booking.reserved","id":"123"}]"#;
        let response = Response::builder()
            .status(200)
            .header("X-CloudEvents", events_json)
            .body(b"{\"status\":\"ok\"}")
            .build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 1);
    }

    #[test]
    fn test_extract_events_from_body() {
        let body = r#"{"data":{"id":"123"},"events":[{"type":"albergue.v1.booking.reserved"}]}"#;
        let response = Response::builder()
            .status(200)
            .body(body.as_bytes())
            .build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 1);
    }

    #[test]
    fn test_no_events() {
        let response = Response::builder()
            .status(200)
            .body(b"{\"status\":\"ok\"}")
            .build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 0);
    }
}
