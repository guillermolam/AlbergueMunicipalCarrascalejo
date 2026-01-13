# ADR 0001: Adopt Spin + Wasm components

- Status: accepted
- Date: 2026-01-12

## Context

The system needs to run as a set of small services with clear boundaries and predictable deployment on Fermyon/Spin.

Wasm imposes constraints on networking and runtime capabilities, but Spin provides a component model, triggers, and host capabilities for HTTP and other integrations.

## Decision

Run the gateway and backend services as Rust WebAssembly components under Spin.

## Consequences

- Outbound networking must use Spin host APIs and be explicitly allowed.
- Some libraries that assume native sockets may be incompatible inside Wasm.
- Local development and CI need to accommodate Spin/Wasm build targets.

## Alternatives considered

- Native Rust services (containers): broader library compatibility, but diverges from Spin target deployment.
- Node/Express gateway: rejected by project constraints and Spin alignment.

## References

- Spin rules and constraints: [.trae/documents/SPIN.md](../../.trae/documents/SPIN.md)
- Outbound HTTP constraints: [docs/spin-http-outbound-compliance.md](../spin-http-outbound-compliance.md)