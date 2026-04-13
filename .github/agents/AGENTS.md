# AGENTS.md — Foundational Agent Registry

This file documents the core agents for the AlbergueMunicipalCarrascalejo repository. Each agent is specialized for a key domain of the project lifecycle, CI/CD, infrastructure, frontend, backend, and security. Use these agents for focused, high-quality automation and review.

---

## 1. astro-frontend-dev.agent.md
- **Role:** Astro + Solid frontend architect, Figma parity, Tailwind/daisyUI, no React, Cloudflare-aware SSR/static, 3D/Map via Three.js/MapLibreGL.
- **Scope:** UI, design system, runtime JS, SSR/static, Cloudflare, Figma tokens, accessibility.
- **When to use:** Frontend features, design, SSR/static, Cloudflare, 3D/Map, runtime JS.

## 2. ci-cd-cloud.agent.md
- **Role:** CI/CD pipeline architect for GitHub Actions, Cloudflare, Fermyon/Spin.
- **Scope:** Workflow authoring, deployment, secrets, automation, troubleshooting.
- **When to use:** CI/CD, deployment, workflow, automation, migration, best practices.

## 3. backend-spin-dev.agent.md
- **Role:** Rust/Spin backend architect, Wasm, Spin manifest, outbound policy, D1, API, eventing.
- **Scope:** Rust services, Spin manifest, API, eventing, DB, outbound HTTP, security.
- **When to use:** Backend, Spin, Rust, API, DB, eventing, outbound policy, security.

## 4. infra-cloudflare.agent.md
- **Role:** Cloudflare infrastructure engineer, Pages, Workers, KV, D1, routing, security.
- **Scope:** Infra as code, wrangler, KV, D1, routing, secrets, security, deployment.
- **When to use:** Cloudflare infra, routing, KV, D1, wrangler, security, deployment.

## 5. security-aikido.agent.md
- **Role:** Security automation, Aikido MCP, code scanning, secrets, policy enforcement.
- **Scope:** Security scanning, Aikido, secrets, policy, remediation, best practices.
- **When to use:** Security, code scanning, secrets, policy, remediation, best practices.

---

**How to use:**
- Pick the agent matching your domain/task.
- Each agent is defined in `.github/agents/` as a `.agent.md` file.
- Use `runSubagent` to review, optimize, or enhance any agent.

**Next steps:**
- Review and optimize each agent using `runSubagent`.
- Each agent should self-review and suggest improvements via `runSubagent`.
