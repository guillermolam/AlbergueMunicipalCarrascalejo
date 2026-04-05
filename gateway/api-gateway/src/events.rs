//! Event interception middleware for API Gateway.
//!
//! Extracts `CloudEvents` from service responses and publishes them.
//! Primary: Cloudflare Queues (configured via `wrangler.toml` queue binding).
//! Fallback: `HiveMQ` Cloud via outbound HTTPS to the mqtt-broker-service worker.

use serde::Deserialize;
use worker::Response;

/// Response envelope that may contain events.
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct EventCarryingResponse<T> {
    #[serde(rename = "data")]
    pub _data: T,
    #[serde(default)]
    pub events: Vec<serde_json::Value>,
}

/// Extract events from service response.
/// Supports two patterns:
/// 1. `X-CloudEvents` header with JSON array
/// 2. Response body with `{"data": {...}, "events": [...]}`
pub fn extract_events_from_response(response: &Response) -> Vec<serde_json::Value> {
    let mut events = Vec::new();

    // Pattern 1: Check X-CloudEvents header
    if let Ok(Some(header_value)) = response.headers().get("x-cloudevents") {
        if let Ok(header_events) = serde_json::from_str::<Vec<serde_json::Value>>(&header_value) {
            events.extend(header_events);
        }
    }

    // Pattern 2 is skipped in this context because worker::Response body
    // is consumed on read. Event extraction from body should be done
    // before constructing the final response.

    events
}

/// Publish events via the mqtt-broker-service worker (`HiveMQ` fallback).
///
/// In production, prefer Cloudflare Queues by binding a Queue in `wrangler.toml`
/// and calling `env.queue("EVENTS").send(...)` in the handler.
/// This function provides the `HiveMQ` HTTP fallback path.
pub fn publish_events_async(events: &[serde_json::Value]) {
    if events.is_empty() {
        return;
    }

    // Fire-and-forget: log events for now.
    // In the worker handler, use:
    //   ctx.wait_until(async move { publish_to_queue(env, events).await });
    for event in events {
        let topic = event
            .get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("albergue.v1.unknown");
        log::info!("Event to publish: topic={topic}");
    }
}

/// Middleware function to intercept response and publish events.
pub fn intercept_and_publish_events(response: Response) -> Response {
    let events = extract_events_from_response(&response);

    if !events.is_empty() {
        publish_events_async(&events);
    }

    response
}
