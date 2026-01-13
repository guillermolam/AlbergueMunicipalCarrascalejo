# 1. Introduction and Goals

Albergue Municipal Carrascalejo is a web system for managing information and operations of a municipal hostel (Camino de Santiago / Vía de la Plata). It is designed for static-first delivery, with a gateway that centralizes all integration and backend traffic, and Spin/Wasm-compatible Rust services.

## 1.1 Requirements overview

Primary features (high-level):
- Public-facing site (information, booking journeys, confirmations)
- Admin console pages (operational UI, service visibility)
- Service-oriented backend (Rust services running as Spin components)
- Configuration and secrets via Spin variables/runtime config (no secrets in git)

## 1.2 Quality goals

Top quality goals:
- Fast static delivery and minimal client-side JavaScript
- Strong security posture (secrets handling, least-privilege outbound networking)
- Deployability on Spin/Fermyon (Wasm constraints respected)
- Clear modularity (frontend vs gateway vs backend services vs domain model)
- Traceability of architecture decisions (ADRs)

## 1.3 Stakeholders

- Pilgrim/guest: wants fast access to information and booking flows
- Staff/admin: needs operational views and predictable system behavior
- Maintainers: want a stable, testable, Spin-aligned architecture

See also:
- [2. Architecture Constraints](02-architecture-constraints.md)
- [3. System Scope and Context](03-system-scope-and-context.md)
- [10. Quality Requirements](10-quality-requirements.md)