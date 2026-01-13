# 6. Runtime View

Representative runtime scenarios are shown below.

## 6.1 Fetch booking information

```mermaid
sequenceDiagram
  participant B as Browser
  participant F as Frontend (static)
  participant G as Gateway (Spin)
  participant S as Booking Service
  participant D as Database

  B->>F: GET /book
  F-->>B: HTML/CSS/JS (static)
  B->>G: GET /api/booking/...
  G->>S: Route request (component call)
  S->>D: Query availability/pricing
  D-->>S: Rows
  S-->>G: JSON response
  G-->>B: JSON response
```

## 6.2 Publish domain event (evented architecture)

The project intends to use an internal broker component to publish and fan-out events (e.g., via MQTT topics) and optional webhook delivery.

```mermaid
sequenceDiagram
  participant S as Service (Publisher)
  participant P as shared::EventPublisher
  participant B as mqtt-broker-service
  participant R as Redis
  participant C as Subscriber service

  S->>P: publish(event)
  P->>B: POST /api/mqtt/publish
  B->>R: Persist / index message
  B-->>C: Deliver (pub/sub or webhook)
```

See also:
- Existing proposal notes: [.trae Evented Architecture](../../.trae/documents/Evented%20Architecture%20with%20MQTT,%20CQRS,%20DLQ%20and%20Schemas.md)