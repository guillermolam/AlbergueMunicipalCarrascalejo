# Domain Events Implementation - MQTT Broker Service

## Overview

This implementation provides a complete domain event publishing and subscribing system using CloudEvents specification and webhook-based delivery. Events flow from backend services through the gateway to an MQTT broker service, which delivers them to registered webhook endpoints in subscriber services.

## Architecture

```
Backend Services → Gateway → MQTT Broker → Webhook Delivery → Subscriber Services
```

### Components

1. **mqtt-broker-service** - HTTP-based message broker with Redis backend
2. **Gateway Event Interceptor** - Extracts events from service responses
3. **Domain Events (shared)** - CloudEvents-compliant event definitions
4. **Event Publisher (shared)** - Fire-and-forget HTTP client
5. **Webhook Handler (shared)** - Utilities for receiving events

## Topic Naming Convention

All events follow the hierarchical pattern: `albergue.v1.{aggregate}.{event}`

### Event Topics

**Pilgrim Aggregate** (`albergue.v1.pilgrim.*`):

- `albergue.v1.pilgrim.registered`
- `albergue.v1.pilgrim.updated`
- `albergue.v1.pilgrim.gdpr_consent_recorded`

**Booking Aggregate** (`albergue.v1.booking.*`):

- `albergue.v1.booking.reserved`
- `albergue.v1.booking.bed_assigned`
- `albergue.v1.booking.confirmed`
- `albergue.v1.booking.cancelled`
- `albergue.v1.booking.expired`

**Payment Aggregate** (`albergue.v1.payment.*`):

- `albergue.v1.payment.recorded`
- `albergue.v1.payment.completed`

**Government Submission** (`albergue.v1.government.*`):

- `albergue.v1.government.submission_queued`
- `albergue.v1.government.submission_succeeded`
- `albergue.v1.government.submission_failed`

**Bed Aggregate** (`albergue.v1.bed.*`):

- `albergue.v1.bed.status_changed`

## CloudEvents Format

All events use CloudEvents 1.0 specification with lenient parsing:

```json
{
  "specversion": "1.0",
  "type": "albergue.v1.booking.reserved",
  "source": "booking-service",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-01-12T10:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "booking_id": "booking-123",
    "pilgrim_id": "pilgrim-456",
    "check_in_date": "2026-01-15",
    "check_out_date": "2026-01-16",
    "nights": 1,
    "total_amount": 25.0,
    "expires_at": "2026-01-12T12:30:00Z"
  }
}
```

## Usage

### Publishing Events (Service → Gateway)

Services can publish events using two patterns:

**Pattern 1: X-CloudEvents Header**

```rust
use shared::events::{CloudEvent, BookingReserved, topics};

let event = CloudEvent::new(
    topics::BOOKING_RESERVED.to_string(),
    "booking-service".to_string(),
    BookingReserved { /* ... */ },
);

let events_json = serde_json::to_string(&vec![event])?;

Response::builder()
    .status(200)
    .header("X-CloudEvents", events_json)
    .body(/* response data */)
    .build()
```

**Pattern 2: Response Envelope**

```rust
#[derive(Serialize)]
struct EventCarryingResponse<T> {
    data: T,
    events: Vec<CloudEvent<EventData>>,
}

let response = EventCarryingResponse {
    data: booking_result,
    events: vec![booking_reserved_event],
};
```

### Registering Webhooks (Subscriber Services)

Services register their webhook endpoints on startup:

```rust
use shared::webhook_handler::register_webhook;

// Register webhook with topic filters
register_webhook(
    "notification-service",
    "http://notification-service.spin.internal/webhooks/events",
    vec![
        "albergue.v1.booking.*".to_string(),
        "albergue.v1.payment.*".to_string(),
    ],
)?;
```

### Handling Events (Webhook Endpoint)

Implement a webhook endpoint to receive events:

```rust
use shared::webhook_handler::{parse_cloud_event, EventHandler};
use shared::events::topics;

router.post("/webhooks/events", handle_webhook);

async fn handle_webhook(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let event = parse_cloud_event(req.body())?;

    match event.event_type.as_str() {
        topics::BOOKING_RESERVED => {
            let data: BookingReserved = serde_json::from_value(event.data)?;
            // Send reservation confirmation notification
            send_notification(&data)?;
        }
        topics::PAYMENT_COMPLETED => {
            let data: PaymentCompleted = serde_json::from_value(event.data)?;
            // Send payment receipt
            send_receipt(&data)?;
        }
        _ => {
            log::debug!("Unhandled event: {}", event.event_type);
        }
    }

    Ok(Response::new(200, "OK"))
}
```

## Event Flow

1. **Service Action**: Backend service performs domain operation (e.g., reserve booking)
2. **Event Creation**: Service creates CloudEvent and attaches to response
3. **Gateway Interception**: Gateway extracts events from response
4. **Fire-and-Forget Publish**: Gateway publishes to mqtt-broker-service (async)
5. **Broker Storage**: Broker stores event in Redis
6. **Webhook Matching**: Broker finds subscribers with matching topic filters
7. **Webhook Delivery**: Broker POSTs event to subscriber webhooks (fire-and-forget)
8. **Event Handling**: Subscriber processes event

## Service-to-Event Mapping

### Publishers

| Service                         | Events Published                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **booking-service**             | BookingReserved, BookingBedAssigned, BookingConfirmed, BookingCancelled, BookingExpired, PaymentRecorded, PaymentCompleted, GovernmentSubmissionQueued, BedStatusChanged |
| **info-on-arrival-service**     | PilgrimRegistered, PilgrimUpdated, GDPRConsentRecorded                                                                                                                   |
| **document-validation-service** | GovernmentSubmissionSucceeded, GovernmentSubmissionFailed                                                                                                                |

### Subscribers

| Service                         | Subscribed Topics                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| **notification-service**        | `albergue.v1.booking.*`, `albergue.v1.payment.*`, `albergue.v1.pilgrim.registered` |
| **document-validation-service** | `albergue.v1.booking.confirmed`                                                    |
| **info-on-arrival-service**     | `albergue.v1.booking.confirmed`                                                    |
| **security-service**            | `*` (all events for audit logging)                                                 |
| **reviews-service**             | `albergue.v1.booking.expired`                                                      |

## Configuration

### spin.toml Updates

All services have been configured with:

```toml
[component.service-name]
allowed_outbound_hosts = [
    # ... existing hosts ...
    "http://mqtt-broker-service.spin.internal",
]
```

### mqtt-broker-service Configuration

```toml
[component.mqtt-broker-service]
source = "backend/mqtt-broker-service/target/wasm32-wasip1/release/mqtt_broker_service.wasm"
allowed_outbound_hosts = ["redis://*", "http://*.spin.internal"]
key_value_stores = ["default"]

[component.mqtt-broker-service.variables]
redis_url = "{{ redis_url }}"
log_level = "{{ log_level }}"
```

## API Endpoints

### MQTT Broker Service

- `POST /api/mqtt/publish` - Publish event to topic
- `POST /api/mqtt/subscribe` - Subscribe to topic (legacy)
- `POST /api/mqtt/register-webhook` - Register webhook endpoint
- `GET /api/mqtt/messages/:topic` - Retrieve messages
- `GET /api/mqtt/health` - Health check

### Webhook Registration Request

```json
{
  "service_id": "notification-service",
  "webhook_url": "http://notification-service.spin.internal/webhooks/events",
  "topic_filters": ["albergue.v1.booking.*", "albergue.v1.payment.*"]
}
```

## Topic Filtering

The broker supports wildcard matching:

- `albergue.v1.booking.*` - Matches all booking events
- `albergue.v1.payment.completed` - Exact match
- `*` - Matches all events

## Testing

### Manual Event Publishing

```bash
curl -X POST http://localhost:3000/api/mqtt/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "albergue.v1.booking.reserved",
    "payload": "{\"booking_id\":\"123\"}",
    "qos": 0,
    "retain": false
  }'
```

### Register Test Webhook

```bash
curl -X POST http://localhost:3000/api/mqtt/register-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "test-service",
    "webhook_url": "http://localhost:8080/webhooks/test",
    "topic_filters": ["albergue.v1.*"]
  }'
```

## Characteristics

- **Fire-and-Forget**: All operations are asynchronous and non-blocking
- **Ephemeral**: Messages are not persisted long-term
- **At-Most-Once Delivery**: No delivery guarantees or retries
- **Topic-Based Routing**: Events routed via hierarchical topic patterns
- **CloudEvents Compliant**: Uses industry-standard event format with lenient parsing

## Next Steps

1. **Implement webhook endpoints** in each subscriber service
2. **Add event publishing** to domain operations in publisher services
3. **Test end-to-end flow** with integration tests
4. **Add observability** (metrics, tracing) to event pipeline
5. **Consider event persistence** for audit/replay requirements
6. **Add dead letter queue** for failed webhook deliveries (optional)

## References

- [CloudEvents Specification](https://cloudevents.io/)
- [Spin Framework MQTT](https://spinframework.dev/v2/mqtt-outbound)
- [Domain Model Refactor README](../.trae/documents/Domain%20Model%20Refactor%20README%20+%20Mermaid.md)
