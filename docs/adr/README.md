# ADRs (Architectural Decision Records)

This folder contains Architectural Decision Records.

## How to add a new ADR

1. Copy the template: [template.md](template.md)
2. Pick the next number: `NNNN-title-with-dashes.md`
3. Write Context, Decision, and Consequences
4. Link supporting references (code/docs)

## Index

- [0001 Adopt Spin + Wasm components](0001-adopt-spin-wasm-components.md)
- [0002 Use Astro static-first + HTMX for the frontend](0002-astro-static-first-htmx-frontend.md)
- [0003 Gateway is the single ingress and enforces outbound policy](0003-gateway-single-ingress-outbound-policy.md)
- [0004 Manage secrets via Spin variables and runtime config](0004-secrets-via-spin-variables-and-runtime-config.md)
- [0005 Outbound HTTP from Wasm uses Spin host APIs](0005-outbound-http-via-spin-host-apis.md)
- [0006 Turso/libSQL embedded replica strategy](0006-turso-libsql-embedded-replica-strategy.md)
- [0007 Event publishing via mqtt-broker-service (MQTT topics/webhooks)](0007-event-publishing-via-mqtt-broker.md)