## Goals

- Create full architecture documentation following the arc42 template (Markdown + Mermaid).
- Add an ADR repository (decision log) and connect it from arc42 section 9.
- Keep everything under `docs/` and link the whole structure from the repo root `README.md`.
- Reuse and normalize existing material from `docs/` and `.trae/` (replace `file:///...` links with GitHub-friendly relative links).

## Target Folder Structure (GitHub-friendly)

```
docs/
  README.md                    # Docs hub (entrypoint)
  arc42/
    README.md                  # Arc42 index + navigation
    01_introduction_and_goals.md
    02_architecture_constraints.md
    03_system_scope_and_context.md
    04_solution_strategy.md
    05_building_block_view.md
    06_runtime_view.md
    07_deployment_view.md
    08_crosscutting_concepts.md
    09_architectural_decisions.md
    10_quality_requirements.md
    11_risks_and_technical_debt.md
    12_glossary.md
  adr/
    README.md                  # ADR index + “how to write ADRs”
    0001-record-architecture-decisions.md
    0002-spin-wasm-as-runtime.md
    0003-frontend-astro-static-htmx.md
    0004-gateway-as-single-ingress.md
    0005-spin-outbound-http-policy.md
    0006-runtime-config-and-secrets.md
    0007-turso-libsql-embedded-replicas.md
    0008-eventing-mqtt-webhooks.md
  reference/
    runtime-config.md
    security-secrets.md
    spin-http-outbound-compliance.md
    edge-proxy.md
    turso-embedded-replicas.md
    ux/                         # keep existing UX subtree
```

Notes:

- I will **keep existing UX docs** in place and link to them from arc42 section 1/10.
- Existing technical notes currently in `docs/` will be **moved/aliased into `docs/reference/`** (or kept where they are with stable redirect stubs) to avoid broken links.

## Content Mapping (reuse what already exists)

- **02 Constraints**: derive from `.trae/rules/project_rules.md` and `.trae/rules/project_frontend_rules.md` (Astro+HTMX, Spin, security/no-secrets, etc.).
- **03 Context & Scope**: use Spin internal service chaining and gateway concepts; include a Mermaid context diagram.
- **04 Solution Strategy**: summarize core choices (Spin/Wasm, gateway, Astro static frontend, config via Spin variables, etc.).
- **05 Building Blocks**: containers/components view; link out to `backend/README.md`, `gateway/README.md`, `frontend/README.md`.
- **06 Runtime View**: Mermaid sequence diagrams for key flows:
  - frontend → gateway → backend component via `*.spin.internal`
  - auth/login flow (high-level)
  - event publish/webhook receive flow
- **07 Deployment View**: Fermyon/Spin deployment + optional `edge-proxy` (reuse `docs/edge-proxy.md`).
- **08 Crosscutting Concepts**: consolidate and link:
  - runtime config (`docs/runtime-config.md`)
  - outbound HTTP policy (`docs/spin-http-outbound-compliance.md`)
  - secrets policy (`docs/security-secrets.md`)
  - persistence strategy (`docs/TURSO_EMBEDDED_REPLICAS.md`)
- **09 Decisions**: arc42 page that points to `docs/adr/` and lists the accepted ADRs.
- **10 Quality Requirements**: extract explicit “fitness functions” from `.trae/rules/*` into quality scenarios.
- **11 Risks & Technical Debt**: include items like mixed Spin SDK versions / workspace friction (as currently observed) and operational risks (secrets, outbound hosts, DB sync constraints).
- **12 Glossary**: define Spin, component, service chaining, HTMX, bounded context, CQRS, etc.

## GitHub Rendering & Linking Rules

- Use **relative links only** (`../..`), never `file:///`.
- Use Mermaid diagrams inside fenced blocks:
  - ` ```mermaid` for `flowchart`, `sequenceDiagram`, and `C4-like` diagrams.
- Avoid complex Mermaid features that often fail in GitHub (overly nested subgraphs, external includes).
- Keep file names stable and numbered to preserve ordering.

## README Integration

- Update repo root `README.md` to add a new section:
  - “Architecture (arc42)” → `docs/README.md`
- `docs/README.md` becomes the navigation hub linking to `docs/arc42/README.md`, `docs/adr/README.md`, and `docs/reference/`.

## Implementation Steps (what I will do after you confirm)

1. Create `docs/README.md`, `docs/arc42/README.md`, and all arc42 section files with consistent navigation (Prev/Next + ToC).
2. Create `docs/adr/README.md` plus an ADR template, then seed initial ADRs based on existing docs/rules.
3. Create `docs/reference/` and migrate or alias existing technical notes from `docs/`.
4. Replace any `file:///...` links found in `.trae`-derived content with repo-relative links.
5. Add Mermaid diagrams (context/container/runtime/deployment) across relevant arc42 sections.
6. Update root `README.md` to link into the new docs hub.
7. Verify links locally (spot-check with grep + build GitHub-friendly relative paths), and ensure Markdown renders cleanly.

## Open Decisions I will encode as ADRs (initial set)

- ADR-0002: Spin/Wasm as runtime for services and gateway
- ADR-0003: Astro static frontend + HTMX progressive enhancement
- ADR-0004: Gateway as single ingress; service chaining via `*.spin.internal`
- ADR-0005: Spin outbound HTTP policy + allowed hosts in `spin.toml`
- ADR-0006: Secrets policy + configuration via Spin variables/runtime config
- ADR-0007: Turso/libSQL embedded replica strategy
- ADR-0008: Eventing via MQTT broker + webhooks (based on existing event architecture notes)
