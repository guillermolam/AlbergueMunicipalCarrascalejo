# ADR 0007: Event publishing via mqtt-broker-service (MQTT topics/webhooks)

- Status: proposed
- Date: 2026-01-12

## Context

The backend includes an MQTT broker component that persists messages (Redis-backed) and can support pub/sub and webhook delivery. The codebase also includes shared publishing utilities.

The project aims for an evented architecture (DDD, CQRS) and needs a consistent way to publish and subscribe to domain events.

## Decision

Use the internal broker component (`mqtt-broker-service`) as the event distribution mechanism (topics and/or webhooks). Standardize event topics and envelopes as the architecture evolves.

## Consequences

- A shared event envelope and schema/versioning should be introduced.
- The broker may need DLQ/idempotency/circuit-breaker behavior as usage grows.

## Alternatives considered

- Direct HTTP calls between services: simpler but increases coupling.
- External managed event bus: adds operational overhead and may not align with Spin constraints.

## References

- Evented architecture proposal: [.trae/documents/Evented Architecture with MQTT, CQRS, DLQ and Schemas.md](../../.trae/documents/Evented%20Architecture%20with%20MQTT,%20CQRS,%20DLQ%20and%20Schemas.md)
- Broker implementation: [backend/mqtt-broker-service](../../backend/mqtt-broker-service)
- Shared publisher: [backend/shared/src/event_publisher.rs](../../backend/shared/src/event_publisher.rs)