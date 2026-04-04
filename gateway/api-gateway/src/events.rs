// Event interception middleware for API Gateway
// Extracts CloudEvents from service responses and publishes to external MQTT broker

use serde::Deserialize;
use spin_sdk::http::Response;
use spin_sdk::mqtt::Connection;
use spin_sdk::variables;

/// Response envelope that may contain events
#[derive(Debug, Deserialize)]
pub struct EventCarryingResponse<T> {
    #[serde(rename = "data")]
    pub _data: T,
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
        .find(|(k, _)| k.eq_ignore_ascii_case("x-cloudevents"))
    {
        if let Ok(header_str) = std::str::from_utf8(header_value.as_bytes()) {
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

/// Publish events to external MQTT broker (`HiveMQ` Cloud) using Spin MQTT API
#[allow(clippy::manual_let_else)]
pub fn publish_events_async(events: Vec<serde_json::Value>) {
    if events.is_empty() {
        return;
    }

    let mqtt_host = variables::get("mqtt_broker_host")
        .unwrap_or_else(|_| "4daf0d9c7c5f4112a62ec2f01b94518d.s1.eu.hivemq.cloud".to_string());
    let mqtt_port = variables::get("mqtt_broker_port").unwrap_or_else(|_| "8883".to_string());
    let mqtt_username =
        variables::get("mqtt_username").unwrap_or_else(|_| "alberguecarrascalejo_hive".to_string());
    let mqtt_password = variables::get("mqtt_password").unwrap_or_default();

    let mqtt_address = format!("{mqtt_host}:{mqtt_port}");

    let connection = match Connection::open(&mqtt_address, &mqtt_username, &mqtt_password, 60) {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("Failed to open MQTT connection: {e:?}");
            return;
        }
    };

    for event in events {
        let topic = event
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("albergue.v1.unknown");

        let payload = match serde_json::to_vec(&event) {
            Ok(p) => p,
            Err(_) => continue,
        };

        let _ = connection.publish(topic, &payload, spin_sdk::mqtt::Qos::AtLeastOnce);
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
            .body(r#"{"status":"ok"}"#)
            .build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 1);
    }

    #[test]
    fn test_extract_events_from_body() {
        let body = r#"{"data":{"id":"123"},"events":[{"type":"albergue.v1.booking.reserved"}]}"#;
        let response = Response::builder().status(200).body(body).build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 1);
    }

    #[test]
    fn test_no_events() {
        let response = Response::builder()
            .status(200)
            .body(r#"{"status":"ok"}"#)
            .build();

        let extracted = extract_events_from_response(&response);
        assert_eq!(extracted.len(), 0);
    }
}
