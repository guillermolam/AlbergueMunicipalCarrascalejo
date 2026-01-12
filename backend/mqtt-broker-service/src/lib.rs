#![deny(warnings)]
#![warn(clippy::all)]
#![warn(clippy::pedantic)]
#![warn(clippy::nursery)]
#![warn(clippy::cargo)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Method, Params, Request, Response, ResponseBuilder, Router},
    http_component, redis, variables,
};
use std::collections::HashMap;

/// Lightweight MQTT Broker for Spin
/// Handles pub/sub messaging between microservices
/// Uses Redis for message persistence and routing

#[derive(Debug, Serialize, Deserialize)]
struct MqttMessage {
    topic: String,
    payload: String,
    qos: u8,
    retain: bool,
    timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SubscriptionRequest {
    topic: String,
    client_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct PublishRequest {
    topic: String,
    payload: String,
    qos: Option<u8>,
    retain: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WebhookRegistration {
    /// Service name or identifier
    service_id: String,
    /// Webhook URL to POST events to
    webhook_url: String,
    /// Topic filter patterns (e.g., "albergue.v1.booking.*")
    topic_filters: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WebhookSubscription {
    service_id: String,
    webhook_url: String,
    topic_filters: Vec<String>,
    registered_at: String,
}

#[http_component]
fn handle_mqtt(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::default();

    router.post("/api/mqtt/publish", handle_publish);
    router.post("/api/mqtt/subscribe", handle_subscribe);
    router.post("/api/mqtt/register-webhook", handle_register_webhook);
    router.get("/api/mqtt/messages/:topic", handle_get_messages);
    router.get("/api/mqtt/health", handle_health);

    Ok(router.handle(req))
}

/// Publish message to topic
async fn handle_publish(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let publish_req: PublishRequest = serde_json::from_slice(req.body())?;

    let message = MqttMessage {
        topic: publish_req.topic.clone(),
        payload: publish_req.payload,
        qos: publish_req.qos.unwrap_or(0),
        retain: publish_req.retain.unwrap_or(false),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    // Store message in Redis
    let redis_address = variables::get("redis_address")?;
    let message_key = format!("mqtt:topic:{}:messages", message.topic);
    let message_json = serde_json::to_vec(&message)?;

    // Add to list (LPUSH for newest first)
    redis::execute(
        &redis_address,
        "LPUSH",
        &[message_key.as_bytes(), &message_json],
    )
    .await?;

    // Trim list to keep only last 100 messages per topic
    redis::execute(
        &redis_address,
        "LTRIM",
        &[message_key.as_bytes(), b"0", b"99"],
    )
    .await?;

    // If retain flag is set, store as retained message
    if message.retain {
        let retain_key = format!("mqtt:topic:{}:retained", message.topic);
        redis::set(&redis_address, &retain_key, &message_json).await?;
    }

    // Publish to Redis Pub/Sub for real-time delivery
    let channel = format!("mqtt:channel:{}", message.topic);
    redis::execute(
        &redis_address,
        "PUBLISH",
        &[channel.as_bytes(), &message_json],
    )
    .await?;

    // Deliver to registered webhooks (fire-and-forget)
    deliver_to_webhooks(&redis_address, &message.topic, &message_json).await;

    println!(
        "[MQTT Broker] Published message to topic: {} (QoS: {})",
        message.topic, message.qos
    );

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "published",
                "topic": message.topic,
                "timestamp": message.timestamp
            })
            .to_string(),
        )
        .build())
}

/// Register webhook for event delivery
async fn handle_register_webhook(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let registration: WebhookRegistration = serde_json::from_slice(req.body())?;
    
    let redis_address = variables::get("redis_address")?;
    
    let subscription = WebhookSubscription {
        service_id: registration.service_id.clone(),
        webhook_url: registration.webhook_url.clone(),
        topic_filters: registration.topic_filters.clone(),
        registered_at: chrono::Utc::now().to_rfc3339(),
    };
    
    // Store webhook subscription in Redis
    let webhook_key = format!("mqtt:webhooks:{}", registration.service_id);
    let subscription_json = serde_json::to_vec(&subscription)?;
    
    redis::set(&redis_address, &webhook_key, &subscription_json).await?;
    
    // Add to webhooks index
    redis::execute(
        &redis_address,
        "SADD",
        &[b"mqtt:webhooks:index", webhook_key.as_bytes()],
    )
    .await?;
    
    println!(
        "[MQTT Broker] Registered webhook for service {} with filters: {:?}",
        registration.service_id, registration.topic_filters
    );
    
    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "registered",
                "service_id": registration.service_id,
                "topic_filters": registration.topic_filters
            })
            .to_string(),
        )
        .build())
}

/// Deliver message to registered webhooks (fire-and-forget)
async fn deliver_to_webhooks(redis_address: &str, topic: &str, message_json: &[u8]) {
    // Get all webhook subscriptions
    let webhooks_index = match redis::execute(
        redis_address,
        "SMEMBERS",
        &[b"mqtt:webhooks:index"],
    )
    .await {
        Ok(keys) => keys,
        Err(_) => return, // No webhooks registered
    };
    
    for webhook_key in webhooks_index {
        // Get webhook subscription
        let subscription_data = match redis::get(redis_address, &String::from_utf8_lossy(&webhook_key)).await {
            Ok(data) => data,
            Err(_) => continue,
        };
        
        let subscription: WebhookSubscription = match serde_json::from_slice(&subscription_data) {
            Ok(sub) => sub,
            Err(_) => continue,
        };
        
        // Check if topic matches any filter
        if !topic_matches_filters(topic, &subscription.topic_filters) {
            continue;
        }
        
        // Fire-and-forget POST to webhook URL
        let webhook_request = match spin_sdk::http::Request::builder()
            .method(Method::Post)
            .uri(&subscription.webhook_url)
            .header("Content-Type", "application/json")
            .header("X-MQTT-Topic", topic)
            .body(message_json)
            .build() {
                Ok(req) => req,
                Err(_) => continue,
            };
        
        // Fire and forget - ignore result
        let _ = spin_sdk::http::send(webhook_request);
        
        println!(
            "[MQTT Broker] Delivered event to webhook: {} (service: {})",
            subscription.webhook_url, subscription.service_id
        );
    }
}

/// Check if topic matches any of the filter patterns
/// Supports wildcard matching: albergue.v1.booking.* matches albergue.v1.booking.reserved
fn topic_matches_filters(topic: &str, filters: &[String]) -> bool {
    for filter in filters {
        if filter.ends_with(".*") {
            // Prefix wildcard match
            let prefix = &filter[..filter.len() - 2];
            if topic.starts_with(prefix) {
                return true;
            }
        } else if filter == "*" {
            // Match all
            return true;
        } else if filter == topic {
            // Exact match
            return true;
        }
    }
    false
}

/// Subscribe to topic
async fn handle_subscribe(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let sub_req: SubscriptionRequest = serde_json::from_slice(req.body())?;

    let redis_address = variables::get("redis_address")?;

    // Store subscription
    let sub_key = format!("mqtt:subscriptions:{}", sub_req.topic);
    let client_data = serde_json::json!({
        "client_id": sub_req.client_id,
        "subscribed_at": chrono::Utc::now().to_rfc3339()
    });

    redis::execute(
        &redis_address,
        "SADD",
        &[sub_key.as_bytes(), client_data.to_string().as_bytes()],
    )
    .await?;

    println!(
        "[MQTT Broker] Client {} subscribed to topic: {}",
        sub_req.client_id, sub_req.topic
    );

    // Get retained message if exists
    let retain_key = format!("mqtt:topic:{}:retained", sub_req.topic);
    let retained_message = redis::get(&redis_address, &retain_key).await.ok();

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "subscribed",
                "topic": sub_req.topic,
                "client_id": sub_req.client_id,
                "retained_message": retained_message
            })
            .to_string(),
        )
        .build())
}

/// Get messages from topic
async fn handle_get_messages(req: Request, params: Params) -> Result<impl IntoResponse> {
    let topic = params.get("topic").unwrap_or("default");
    let redis_address = variables::get("redis_address")?;

    let message_key = format!("mqtt:topic:{}:messages", topic);

    // Get last N messages from list
    let limit = req
        .query()
        .get("limit")
        .and_then(|l| l.parse::<i32>().ok())
        .unwrap_or(10);

    let messages_data = redis::execute(
        &redis_address,
        "LRANGE",
        &[
            message_key.as_bytes(),
            b"0",
            (limit - 1).to_string().as_bytes(),
        ],
    )
    .await?;

    let mut messages: Vec<MqttMessage> = Vec::new();
    for msg_bytes in messages_data {
        if let Ok(message) = serde_json::from_slice::<MqttMessage>(&msg_bytes) {
            messages.push(message);
        }
    }

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&messages)?)
        .build())
}

/// Health check
fn handle_health(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    Ok(Response::new(
        200,
        serde_json::json!({
            "status": "healthy",
            "service": "mqtt-broker"
        })
        .to_string(),
    ))
}
