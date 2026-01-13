# 2. Architecture Constraints

This section captures non-negotiable constraints (technical and organizational).

## 2.1 Frontend constraints

- Framework: Astro (static-first)
- Interaction model: HTMX for progressive enhancement; minimal client JS
- Styling: Tailwind CSS v4 + daisyUI + AstroUXDS
- Design tokens/palette: Extremadura palette only (no new hues)
- Package manager: pnpm
- No React components as the primary UI framework (Solid islands are allowed when needed)

Primary source rulesets:
- [.trae/rules/project_frontend_rules.md](../../.trae/rules/project_frontend_rules.md)
- [.trae/rules/project_rules.md](../../.trae/rules/project_rules.md)

## 2.2 Backend and gateway constraints

- Runtime: Spin (Fermyon) with WebAssembly components
- Language: Rust for backend services and gateway components
- Outbound networking: only via Spin host capabilities and must be declared in `allowed_outbound_hosts` in `spin.toml`
- No secrets committed to the repository; configuration via Spin variables and runtime config files

Supporting references:
- [Spin HTTP outbound compliance](../reference/README.md#spin--fermyon--wasm)
- [Secrets policy](../reference/README.md#security)
- [Runtime configuration](../reference/README.md#spin--fermyon--wasm)

## 2.3 Process constraints

- Architecture decisions must be recorded as ADRs and linked from arc42 section 9
- Documentation must render on GitHub (Markdown + Mermaid, no `file:///` links)

See also:
- [8. Cross-cutting Concepts](08-crosscutting-concepts.md)
- [9. Architectural Decisions](09-architectural-decisions.md)
- [10. Quality Requirements](10-quality-requirements.md)