# 4. Solution Strategy

Core strategy:
- Static-first frontend using Astro, enhanced progressively (HTMX) when needed
- Gateway as the single ingress/egress integration point (auth, routing, outbound policy)
- Rust services compiled to WebAssembly and run as Spin components
- Favor clear boundaries: `frontend/`, `gateway/`, `backend/`, `domain_model/`
- Capture architecture decisions as ADRs and keep arc42 as the narrative map

Key implications:
- Traditional socket-based networking libraries are limited in Wasm; outbound HTTP must use Spin host APIs
- Configuration is injected via Spin variables / runtime configuration (avoid committed secrets)
- Deployment favors a single canonical Spin application manifest and component composition

See also:
- [5. Building Block View](05-building-block-view.md)
- [8. Cross-cutting Concepts](08-crosscutting-concepts.md)
- [9. Architectural Decisions](09-architectural-decisions.md)