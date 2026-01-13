# ADR 0002: Use Astro static-first + HTMX for the frontend

- Status: accepted
- Date: 2026-01-12

## Context

The frontend must be lightweight, fast, and deployable as static assets served by Spin.

The project constrains framework and styling choices (Astro, Tailwind v4, daisyUI, AstroUXDS, Extremadura palette tokens) and aims to minimize client-side JavaScript.

## Decision

Use Astro as the primary frontend framework with static output by default, using HTMX for progressive enhancement and small scoped JavaScript only when unavoidable.

## Consequences

- Many interactions should be implemented as HTML-over-the-wire (fragments) instead of heavy client frameworks.
- Realtime behavior should be implemented in small islands, not across entire pages.
- Pages that require request headers must opt out of prerendering or be handled by the gateway.

## Alternatives considered

- React SPA: rejected by explicit project constraints.
- SSR-first frontend: increases operational complexity and can conflict with static deployment goals.

## References

- Frontend rules: [.trae/rules/project_frontend_rules.md](../../.trae/rules/project_frontend_rules.md)
- Global project constraints: [.trae/rules/project_rules.md](../../.trae/rules/project_rules.md)