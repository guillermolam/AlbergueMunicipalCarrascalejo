# AGENTS.md - Foundational Agent Registry

This registry maps agent roles to the actual repository architecture and technology choices.

## Lifecycle Coverage

1. Plan and implement frontend features on Astro/Cloudflare
2. Build and evolve Rust backend services for Worker runtime
3. Manage Cloudflare infrastructure and bindings
4. Automate CI/CD and deployment safety
5. Run security scan/remediation loops
6. Execute browser-level validation when needed

## Agents

## 1. astro-frontend-dev.agent.md
- Role: Astro frontend specialist for SSR/static Cloudflare deployment.
- Primary stack awareness: Astro 6, Alpine.js, nanostores, Three.js, MapLibreGL, optional Solid islands, no React.
- Use for: pages/layouts/components, runtime script integration, frontend architecture alignment.

## 2. backend-spin-dev.agent.md
- Role: Rust backend specialist for Worker-based services and shared crates.
- Primary stack awareness: `worker` crate services, wasm/native target guards, shared models, API/service boundaries.
- Use for: service features, refactors, clippy/build fixes, runtime-safe dependency changes.

## 3. infra-cloudflare.agent.md
- Role: Cloudflare infrastructure specialist.
- Primary stack awareness: `frontend/wrangler.jsonc`, `backend/*/wrangler.toml`, KV, D1, queues, vars, routing, Terraform.
- Use for: binding updates, route strategy, environment consistency, deploy config hardening.

## 4. ci-cd-cloud.agent.md
- Role: CI/CD specialist.
- Primary stack awareness: GitHub Actions, pnpm + Astro workflow, Cargo service workflow, Wrangler deploy paths, Spin/Fermyon tasks.
- Use for: workflow design, optimization, test/deploy gating, secrets-safe automation.

## 5. security-aikido.agent.md
- Role: Security specialist.
- Primary stack awareness: Aikido-guided scan/fix/verify cycles, secrets hygiene, CI security gates.
- Use for: security reviews, remediations, policy enforcement, risk reporting.

## 6. browser-test.agent.md
- Role: Browser validation and visual/testing specialist.
- Use for: UI verification, screenshot-based checks, browser-level issue reproduction.

## Usage Guidance

- Pick the most specific agent for the task domain.
- For cross-cutting tasks, run domain agents first, then CI/security agents for final hardening.
- Keep agent prompts synchronized with repository manifests whenever dependencies/runtime targets change.
