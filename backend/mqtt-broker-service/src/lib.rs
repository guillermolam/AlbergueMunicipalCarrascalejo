#![deny(warnings)]
#![warn(clippy::all)]
#![allow(clippy::unused_async)]

use serde::{Deserialize, Serialize};
use worker::*;

/// Quality of Service levels for MQTT messages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QoS {
    /// At most once (fire and forget)
    AtMostOnce = 0,
    /// At least once (acknowledged delivery)
    AtLeastOnce = 1,
    /// Exactly once (assured delivery)
    ExactlyOnce = 2,
}

/// Represents an MQTT publish request received by the broker service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttPublishRequest {
    /// The MQTT topic to publish to (e.g. "albergue/sensors/temperature")
    pub topic: String,
    /// The message payload
    pub payload: String,
    /// Quality of Service level
    pub qos: QoS,
    /// Whether the broker should retain this message
    pub retain: bool,
}

/// Represents the response returned by the broker service after processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MqttBrokerResponse {
    /// Whether the operation succeeded
    pub success: bool,
    /// Human-readable status message
    pub message: String,
    /// Echo of the topic the message was published to
    pub topic: Option<String>,
}

/// Validates an MQTT topic string.
///
/// Topics must be non-empty, must not contain the null character,
/// and must not exceed 65535 bytes (per the MQTT spec).
pub fn validate_topic(topic: &str) -> std::result::Result<(), String> {
    if topic.is_empty() {
        return Err("Topic must not be empty".to_string());
    }
    if topic.len() > 65535 {
        return Err("Topic must not exceed 65535 bytes".to_string());
    }
    if topic.contains('\0') {
        return Err("Topic must not contain null character".to_string());
    }
    Ok(())
}

/// Validates a QoS integer value, returning the enum variant or an error.
pub fn qos_from_u8(value: u8) -> std::result::Result<QoS, String> {
    match value {
        0 => Ok(QoS::AtMostOnce),
        1 => Ok(QoS::AtLeastOnce),
        2 => Ok(QoS::ExactlyOnce),
        other => Err(format!("Invalid QoS value: {other}. Must be 0, 1, or 2")),
    }
}

/// Builds a success response for a publish operation.
pub fn build_success_response(topic: &str) -> MqttBrokerResponse {
    MqttBrokerResponse {
        success: true,
        message: "Message accepted for delivery".to_string(),
        topic: Some(topic.to_string()),
    }
}

/// Builds an error response.
pub fn build_error_response(error: &str) -> MqttBrokerResponse {
    MqttBrokerResponse {
        success: false,
        message: error.to_string(),
        topic: None,
    }
}

#[event(fetch)]
#[tracing::instrument(name = "mqtt_broker_fetch", skip_all)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    tracing::info!(method = %req.method(), path = %req.path(), "Incoming request");

    match req.method() {
        Method::Post => {
            tracing::info!("MQTT publish endpoint hit");
            let response = build_success_response("stub");
            Response::from_json(&response)
        }
        _ => {
            tracing::warn!(method = %req.method(), "Method not allowed");
            let response = build_error_response("Not found");
            let json = serde_json::to_string(&response)
                .unwrap_or_else(|_| r#"{"error":"internal"}"#.to_string());
            let mut resp = Response::error(&json, 404)?;
            resp.headers_mut().set("Content-Type", "application/json")?;
            Ok(resp)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── MqttPublishRequest serialization / deserialization ───────────

    #[test]
    fn test_publish_request_serialization_roundtrip() {
        let request = MqttPublishRequest {
            topic: "albergue/sensors/temperature".to_string(),
            payload: r#"{"value":22.5}"#.to_string(),
            qos: QoS::AtLeastOnce,
            retain: false,
        };

        let json = serde_json::to_string(&request).expect("serialize");
        let deserialized: MqttPublishRequest = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(deserialized.topic, "albergue/sensors/temperature");
        assert_eq!(deserialized.payload, r#"{"value":22.5}"#);
        assert_eq!(deserialized.qos, QoS::AtLeastOnce);
        assert!(!deserialized.retain);
    }

    #[test]
    fn test_publish_request_deserialize_from_json_literal() {
        let json = r#"{
            "topic": "albergue/occupancy",
            "payload": "5",
            "qos": "ExactlyOnce",
            "retain": true
        }"#;

        let req: MqttPublishRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.topic, "albergue/occupancy");
        assert_eq!(req.payload, "5");
        assert_eq!(req.qos, QoS::ExactlyOnce);
        assert!(req.retain);
    }

    // ── MqttBrokerResponse serialization / deserialization ──────────

    #[test]
    fn test_broker_response_serialization_roundtrip() {
        let response = MqttBrokerResponse {
            success: true,
            message: "OK".to_string(),
            topic: Some("test/topic".to_string()),
        };

        let json = serde_json::to_string(&response).expect("serialize");
        let deserialized: MqttBrokerResponse = serde_json::from_str(&json).expect("deserialize");

        assert!(deserialized.success);
        assert_eq!(deserialized.message, "OK");
        assert_eq!(deserialized.topic, Some("test/topic".to_string()));
    }

    #[test]
    fn test_broker_response_with_none_topic() {
        let response = MqttBrokerResponse {
            success: false,
            message: "Error".to_string(),
            topic: None,
        };

        let json = serde_json::to_string(&response).expect("serialize");
        assert!(json.contains(r#""topic":null"#));

        let deserialized: MqttBrokerResponse = serde_json::from_str(&json).expect("deserialize");
        assert!(deserialized.topic.is_none());
    }

    // ── QoS enum ────────────────────────────────────────────────────

    #[test]
    fn test_qos_serialization_variants() {
        assert_eq!(
            serde_json::to_string(&QoS::AtMostOnce).unwrap(),
            r#""AtMostOnce""#
        );
        assert_eq!(
            serde_json::to_string(&QoS::AtLeastOnce).unwrap(),
            r#""AtLeastOnce""#
        );
        assert_eq!(
            serde_json::to_string(&QoS::ExactlyOnce).unwrap(),
            r#""ExactlyOnce""#
        );
    }

    #[test]
    fn test_qos_from_u8_valid_values() {
        assert_eq!(qos_from_u8(0), Ok(QoS::AtMostOnce));
        assert_eq!(qos_from_u8(1), Ok(QoS::AtLeastOnce));
        assert_eq!(qos_from_u8(2), Ok(QoS::ExactlyOnce));
    }

    #[test]
    fn test_qos_from_u8_invalid_value() {
        let err = qos_from_u8(3).unwrap_err();
        assert!(err.contains("Invalid QoS value: 3"));
    }

    // ── Topic validation ────────────────────────────────────────────

    #[test]
    fn test_validate_topic_valid() {
        assert!(validate_topic("albergue/sensors/temperature").is_ok());
        assert!(validate_topic("a").is_ok());
        assert!(validate_topic("a/b/c/d/e").is_ok());
    }

    #[test]
    fn test_validate_topic_empty() {
        let err = validate_topic("").unwrap_err();
        assert_eq!(err, "Topic must not be empty");
    }

    #[test]
    fn test_validate_topic_null_character() {
        let err = validate_topic("albergue/\0/bad").unwrap_err();
        assert!(err.contains("null character"));
    }

    #[test]
    fn test_validate_topic_too_long() {
        let long_topic = "a".repeat(65536);
        let err = validate_topic(&long_topic).unwrap_err();
        assert!(err.contains("65535"));
    }

    // ── Response builder helpers ────────────────────────────────────

    #[test]
    fn test_build_success_response() {
        let resp = build_success_response("sensor/data");
        assert!(resp.success);
        assert_eq!(resp.topic, Some("sensor/data".to_string()));
        assert!(!resp.message.is_empty());
    }

    #[test]
    fn test_build_error_response() {
        let resp = build_error_response("Something went wrong");
        assert!(!resp.success);
        assert_eq!(resp.message, "Something went wrong");
        assert!(resp.topic.is_none());
    }

    // ── JSON format verification ────────────────────────────────────

    #[test]
    fn test_success_response_json_contains_expected_fields() {
        let resp = build_success_response("test/topic");
        let json = serde_json::to_value(&resp).expect("to_value");

        assert!(json.get("success").is_some());
        assert!(json.get("message").is_some());
        assert!(json.get("topic").is_some());
        assert_eq!(json["success"], true);
        assert_eq!(json["topic"], "test/topic");
    }

    #[test]
    fn test_error_response_json_format() {
        let resp = build_error_response("bad request");
        let json = serde_json::to_value(&resp).expect("to_value");

        assert_eq!(json["success"], false);
        assert_eq!(json["message"], "bad request");
        assert!(json["topic"].is_null());
    }
}
