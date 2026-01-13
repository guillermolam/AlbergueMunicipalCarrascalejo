# frontend_rules.md

## North Star

Build an ultra-lightweight, responsive, animated web frontend that runs cleanly as **static assets served by Spin** (Fermyon/SpinKube), using **Astro + HTMX** with minimal client JS, and integrates through a **Gateway** that owns all database and third-party integrations (the frontend never talks to databases directly).

This document is a ruleset plus **fitness functions** (commands) that measure progress and prevent regressions.

---

## Stack and hard constraints

- Framework: **Astro**
- Progressive enhancement: **HTMX** (HTML-over-the-wire)
- CSS: **Tailwind CSS v4 + daisyUI + AstroUXDS**
- Tokens: **Extremadura palette only** (no new hues)
- Runtime: **Spin** (static assets via Spin Fileserver or equivalent)
- Package manager: **pnpm (latest)**
- JavaScript: **as close to zero as possible**
  - HTMX for interactions
  - Small, scoped JS only when unavoidable (e.g., tiny controllers, WebSocket glue)

Spin Fileserver can be added via Spin template and used to serve static directories. ([GitHub][1])

---

## Architecture rules

### 1) The frontend never connects to databases

“Full connection to all databases” means:

- The **Gateway** is the single ingress/egress point to:
  - databases (SQL/NoSQL/vector/etc.)
  - event streams
  - third-party SaaS integrations

- The frontend integrates only with **Gateway HTTP endpoints** (and optionally **Gateway WebSocket/MQTT endpoints** if provided).

### 2) Page types

- **Static pages**: default; rendered at build time.
- **HTMX pages**: dynamic sections swapped via fragments returned from the Gateway (or from a server-side component if you have one).
- **Realtime sections**: islands that subscribe to Gateway realtime (WebSocket/MQTT) with minimal JS.

### 3) Microfrontend boundaries (optional but supported)

If you split into multiple Astro apps:

- Each app builds its own `dist/`.
- Each app is mounted under a base path:
  - `/auth`, `/dashboard`, `/booking`, …

- No cross-app deep imports of pages/routes.

---

## Astro configuration concerns

### Output format

- Prefer static build output:
  - `output: "static"`

- Ensure assets work under subpaths:
  - configure `base` per microfrontend (or ensure relative paths)

- Never assume a root-only deployment.

### Headers and caching

- Use aggressive caching for hashed assets:
  - `Cache-Control: public, max-age=31536000, immutable`

- Use short caching for HTML:
  - `Cache-Control: no-cache` (or short TTL) so deploys update fast

- If the platform injects headers (gateway/proxy), document them and test them.

### Error-free builds

- Type checking + Astro diagnostics must be clean.
- No dynamic imports that bloat the client bundle without measured benefit.

Fitness functions:

```bash
pnpm -v
pnpm install --frozen-lockfile
pnpm dlx astro --version
pnpm run astro:check
pnpm run build
pnpm run preview
```

---

## HTMX rules (performance and correctness)

### Request contracts

All HTMX endpoints must define:

- explicit fragment scope (what HTML fragment is returned)
- deterministic status codes
- no “partial HTML soup” that breaks DOM structure

### Swap discipline

- Use `hx-target` and `hx-swap` explicitly for every interaction.
- Prefer `hx-swap="outerHTML"` for component replacement and `hx-swap="innerHTML"` for content updates.
- Add `hx-push-url="true"` only when navigation semantics are desired.

### Error handling

- Any HTMX request must have a defined error UI path:
  - `hx-on::response-error` (or a global handler)

- Surface Gateway correlation IDs if present.

Fitness functions:

```bash
pnpm run test:htmx
pnpm run e2e -- --grep "htmx"
```

---

## Ultra-lightweight animation strategy

Goal: animated and delightful without heavy JS.

### Default animation toolbox

- CSS transitions/animations (Tailwind utilities + custom keyframes)
- daisyUI component motion patterns
- HTMX swap animations using:
  - `hx-swap` + CSS classes
  - `htmx:beforeSwap` / `htmx:afterSwap` to toggle classes (tiny JS only)

- Respect `prefers-reduced-motion`

### Realtime UI animation

- Animate state changes via CSS (e.g., badge pulse, subtle list insert transitions)
- Never block UI with synchronous waits.

Fitness functions:

```bash
pnpm run lint:motion
pnpm run e2e -- --grep "reduced-motion"
```

---

## Responsive rules

- Mobile-first layout
- Explicit breakpoints mapped to design tokens
- No layout shifts:
  - reserve image space
  - avoid injecting large DOM chunks without placeholders

Fitness functions:

```bash
pnpm run e2e -- --grep "responsive"
pnpm run lighthouse
```

---

## Security rules (frontend)

- No secrets in frontend code, ever.
- All secrets live in:
  - Spin variables/config
  - Gateway secret stores

- PII:
  - never logged in the browser console
  - never included in URLs
  - avoid localStorage for sessions/PII

Fitness functions:

```bash
gitleaks detect --no-git -v
pnpm run sec:lint
pnpm audit --audit-level=high
```

---

## Gateway and integration connectivity (what “full connection” means)

### Required Gateway endpoints (dev and prod)

The Gateway must expose at minimum:

- `GET /healthz` → 200 if process is alive
- `GET /readyz` → 200 only if downstream integrations are healthy
- `GET /meta` → environment + version + commit hash
- `GET /integrations/status` → summarized connectivity (dbs, queues, third parties)

The frontend must:

- call `/meta` to display build/version in a footer or diagnostics screen
- call `/integrations/status` behind an admin-only diagnostics UI (or at least in e2e tests)

Fitness functions:

```bash
curl -fsS "$GATEWAY_BASE_URL/healthz"
curl -fsS "$GATEWAY_BASE_URL/readyz"
curl -fsS "$GATEWAY_BASE_URL/meta"
curl -fsS "$GATEWAY_BASE_URL/integrations/status"
pnpm run e2e -- --grep "gateway-connectivity"
```

---

## Spin and Fermyon deployment model

### Serving the Astro build as static assets in Spin

Preferred: build Astro → serve `dist/` through Spin static fileserver component. The Spin fileserver template can be added via `spin add -t static-fileserver`. ([GitHub][1])

Core local validation:

```bash
pnpm run build
spin doctor
spin build
spin up
```

`spin doctor` checks Spin application issues, and `spin build` produces build artifacts. ([Spin Docs][2])

---

## Environment configuration (no secrets in code)

### Frontend env vars

Only public, non-secret values in the frontend build:

- `PUBLIC_GATEWAY_BASE_URL`
- `PUBLIC_WS_URL` (if applicable)
- `PUBLIC_ENV` (`dev`/`prod`)
- `PUBLIC_VERSION`

### Runtime config in Spin

Use Spin variables/config for anything sensitive and for environment wiring at deploy time. Spin Cloud supports `spin cloud variables` and `spin cloud deploy`, and `spin deploy` is a shortcut to `spin cloud deploy`. ([Spin Docs][2])

Fitness functions:

```bash
spin cloud variables list || true
```

---

## Commands: dev and prod deployment

### Dev: frontend + Spin local

1. Install and build:

```bash
pnpm install --frozen-lockfile
pnpm run build
```

2. Run Spin locally:

```bash
spin doctor
spin build
spin up
```

3. Smoke test:

```bash
curl -fsS http://127.0.0.1:3000/ || true
curl -fsS "$GATEWAY_BASE_URL/readyz"
pnpm run e2e -- --grep "smoke"
```

Note: your local Spin HTTP port depends on `spin.toml`. Ensure the smoke test matches that route.

---

### Prod option A: Fermyon Cloud

Fermyon Cloud deploy flow supports `spin login` and `spin deploy` from the directory containing `spin.toml`. ([Fermyon Developer][3])

Commands:

```bash
spin login
spin doctor
spin build
spin deploy
```

If you need plugin-style explicit commands:

```bash
spin cloud login
spin cloud deploy
```

(`spin deploy` is a shortcut for `spin cloud deploy`). ([Spin Docs][2])

---

### Prod option B: Kubernetes via SpinKube (Spin Operator)

Spin apps are packaged and distributed as OCI artifacts and can be deployed via Spin Operator workflows. ([SpinKube][4])

Minimum flow (conceptual; exact registry and manifests are environment-specific):

```bash
spin doctor
spin build
# package/push to OCI registry (per SpinKube docs and your registry policy)
# deploy manifests to cluster (per Spin Operator setup)
```

Fitness function:

- a cluster deployment is considered valid only if:
  - the app is reachable
  - `/readyz` is green
  - e2e suite passes against the deployed base URL

---

## Fitness function bundle (the “CI truth”)

These must be runnable locally and in CI:

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run astro:check
pnpm run typecheck
pnpm run test
pnpm run build
spin doctor
spin build
pnpm run e2e
```

A change is not done until this bundle is green.

---

## References

- Spin Fileserver component and template usage. ([GitHub][1])
- Spin CLI reference: `spin cloud deploy`, `spin deploy` shortcut, `spin doctor`. ([Spin Docs][2])
- Fermyon Cloud deploy flow using `spin login` and `spin deploy`. ([Fermyon Developer][3])
- SpinKube packaging and distributing Spin apps as OCI artifacts. ([SpinKube][4])

[1]: https://github.com/fermyon/spin-fileserver "GitHub - spinframework/spin-fileserver: A static file server implemented as a Spin component"
[2]: https://spinframework.dev/v2/cli-reference "Spin Command Line Interface (CLI) Reference | Spin Docs"
[3]: https://developer.fermyon.com/cloud/deploy "Deploy an application | Fermyon Developer"
[4]: https://www.spinkube.dev/docs/topics/packaging/ "Packaging and deploying apps | SpinKube"
