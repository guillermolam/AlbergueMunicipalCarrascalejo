# Objectives

- Establish consistent DDD/Hexagonal event flow across backend services
- Introduce CQRS command/query handlers with immutable domain events
- Use MQTT (via existing broker) for publish/subscribe between bounded contexts
- Add event schemas, versioning, idempotency, DLQ, and circuit breaking
- Produce a markdown catalog of all publishers/subscribers and value streams

# Current Findings

- MQTT broker exists and persists messages in Redis with basic publish/subscribe and retained messages (backend/mqtt-broker-service/src/lib.rs:36–155, 157–205).
- No shared domain-event types or JSON schemas found in `backend/shared` (shared crate has DTOs only: backend/shared/src/dto.rs:16–38).
- Booking service has entity and application layers (DDD skeleton present) but no events emitted yet (backend/booking-service/src/domain/entities/booking.rs:68–97; backend/booking-service/src/application/create_booking.rs:45–76).
- Notification/document/rate-limiter/location services are present; cross-service triggers are routed today via HTTP/Gateway; event bus usage is not wired.

# Proposed Architecture

## Event Model & Topics

- Define immutable domain events with envelope:
  - Fields: `event_id`, `event_version`, `event_type`, `aggregate_type`, `aggregate_id`, `occurred_at`, `correlation_id`, `causation_id`, `payload`.
  - Serialize with `serde` and generate JSON Schema via `schemars`.
  - Versioned topics: `albergue.<bounded_context>.v1.<event>`.
- Core events (v1):
  - Booking: `BookingReserved`, `BookingConfirmed`, `BookingCancelled`, `ReservationExpired`.
  - Payment: `PaymentInitiated`, `PaymentConfirmed`, `PaymentFailed`.
  - Documents: `DocumentValidated`, `DocumentRejected`.
  - Notifications: `NotificationSent`, `NotificationFailed`.
  - Security/Audit: `AuditLogged` (optional).

## CQRS Handlers

- Commands create/modify aggregates and append events (immutably) in application layer; queries read from projections/read-models.
- Outbox pattern ensures reliable publish after DB commit.

## MQTT Integration

- Keep existing broker; enhance with:
  - Attempt metadata and `max_attempts` handling.
  - Per-topic DLQ list: `mqtt:dlq:<topic>` when processing exceeds attempts.
  - Idempotency key: `event_id` de-dup in Redis set `mqtt:processed:<subscriber>:<topic>` with TTL.
  - Simple circuit breaker per subscriber/topic using Redis keys (state: closed/open/half-open, rolling counters/time windows).

## Projections / Read Models

- Maintain lightweight projections in Redis (fast) and/or Postgres materialized views for admin dashboards.
- Event handlers in subscribers update projections.

## Observability

- Structured logs include `correlation_id`, `event_id`, `topic`, `subscriber`.
- Metrics counters: `events_published_total`, `events_processed_total`, `events_failed_total`, `dlq_total` per service.

# Implementation Plan

## 1) Shared Crate: Event Types & Schemas

- Add `shared::events` module with:
  - `EventEnvelope<T>` generic.
  - Event payload structs for all events.
  - `schemars` derives to output JSON Schema at build/test time.
- Provide helpers: `new_envelope`, `with_correlation`, `event_topic()`.

## 2) Broker Enhancements

- Extend broker handlers to:
  - Wrap messages with delivery metadata (attempts, headers).
  - On publish, set `event_id` as Redis message id and emit to `mqtt:channel:<topic>`.
  - Add `/api/mqtt/ack` to acknowledge processed message; without ack, make messages available again after visibility timeout.
  - On handler error: increment attempts; if `>max_attempts`, push to `mqtt:dlq:<topic>`.
  - Implement simple circuit breaker using Redis keys: `cb:<subscriber>:<topic>` with open timeout and failure threshold.

## 3) Outbox/Inbox Pattern (Postgres)

- DB migration: create `outbox_events` and `inbox_events` tables with indexes and processing flags.
- Application services write to outbox within the same transaction as aggregate changes.
- A publisher component (Spin HTTP-triggered task) drains outbox -> MQTT publish.

## 4) Services: Publishers & Subscribers

- Booking Service
  - Emit `BookingReserved` on create; `BookingConfirmed` on confirm; `ReservationExpired` on timeout.
  - Subscribe to `PaymentConfirmed` (if payment separate) to confirm booking.
- Document Validation Service
  - Emit `DocumentValidated`/`DocumentRejected` after validation.
- Notification Service
  - Subscribe to `BookingConfirmed`, `ReservationExpired`, `PaymentConfirmed`, `DocumentValidated`.
  - Emit `NotificationSent`/`NotificationFailed
