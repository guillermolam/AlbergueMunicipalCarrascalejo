# ADR 0003: Gateway is the single ingress and enforces outbound policy

- Status: accepted
- Date: 2026-01-12

## Context

The system needs a single place to:
- expose stable public HTTP endpoints
- enforce security and policy (auth, rate limits, headers)
- centralize third-party integrations and database access rules

Spin also enforces outbound allowlists, so keeping orchestration/policy in the gateway reduces duplication.

## Decision

Use the gateway component as the central ingress/egress point. Backend services are invoked via Spin component routing (including in-memory service chaining using `http://<component-id>.spin.internal` where applicable).

## Consequences

- Policies can be implemented once in the gateway.
- Backend services stay focused on domain logic.
- Gateway becomes a critical component and must be well-tested and observable.

## Alternatives considered

- Expose each service directly to the public: increases policy duplication and attack surface.
- Embed policy in each service: inconsistent enforcement and higher maintenance.

## References

- Outbound policy notes: [docs/spin-http-outbound-compliance.md](../spin-http-outbound-compliance.md)
- Gateway/Spin alignment notes: [.trae/documents/Gateway Cleanup and Spin_Fermyon Restructure.md](../../.trae/documents/Gateway%20Cleanup%20and%20Spin_Fermyon%20Restructure.md)