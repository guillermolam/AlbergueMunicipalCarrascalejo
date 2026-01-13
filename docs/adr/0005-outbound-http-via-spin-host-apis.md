# ADR 0005: Outbound HTTP from Wasm uses Spin host APIs

- Status: accepted
- Date: 2026-01-12

## Context

WASI does not provide general-purpose socket APIs. Regular Rust HTTP stacks often fail in Wasm guests. Spin provides outbound HTTP as a host capability.

## Decision

Use Spin host APIs for outbound HTTP from Wasm components (e.g., `spin_sdk::http::send`) and declare outbound allowlists in `spin.toml`.

## Consequences

- Outbound HTTP behavior is constrained by Spin rules (e.g., disallowed headers).
- Dependency selection should consider Wasm compatibility.

## Alternatives considered

- Native networking in Wasm: not generally available under WASI.

## References

- Outbound HTTP notes: [docs/spin-http-outbound-compliance.md](../spin-http-outbound-compliance.md)