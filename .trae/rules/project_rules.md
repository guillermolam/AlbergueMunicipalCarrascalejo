# Project Rules v2.0 Normalized and Hardened With Fitness Functions

## 0) Conflict resolution source of truth

These rules were mutually inconsistent. This version enforces the final constraints stated:

- Frontend: Astro + Vite + TypeScript + pnpm latest
- UI: Tailwind CSS v4 + daisyUI + AstroUXDS + Extremadura palette tokens (no new hues)
- No React (therefore: no shadcn/ui, no react-i18next, no Framer Motion React package, no TanStack Router React)
- Bun removed (Bun does not work well with Astro per constraint)
- Solid is allowed only for interactivity as Astro islands

Fitness functions (must pass):

```bash
pnpm -v
node -v
pnpm dlx astro --version
```

## 1) Frontend architecture objective

Objective: Microfrontend-by-domain using Astro apps, independently buildable and Spin-static deployable.

Rules:

- Monorepo with apps (microfrontends) + packages (shared).
- Each app builds to its own dist and can be hosted under base path (/auth, /dashboard, etc.).
- Prefer Astro routing + base path configuration; only use client routing inside islands where necessary.

Fitness functions:

```bash
pnpm -r --filter ./apps/* run build
pnpm -r --filter ./apps/* run preview
pnpm -r --filter ./apps/* run astro:check
```

Workspace scripts must exist and work:

- pnpm dev
- pnpm build
- pnpm test
- pnpm lint
- pnpm format
- pnpm typecheck

## 2) Routing objective

Objective: Routing is isolated per microfrontend and Spin-friendly.

Rules:

- Each app owns its routes within its base path.
- No cross-app deep imports of pages or routes.
- If a client router is truly needed inside a Solid island, use TanStack Router (Solid variant) only within that island.

Fitness functions:

```bash
pnpm -r --filter ./apps/* run routes:validate
pnpm -r --filter ./apps/* run build
```

Implementation expectation:

- routes:validate fails if any app references another app’s route space.

## 3) Styling and tokens objective

Objective: Tailwind v4 + daisyUI + AstroUXDS with Extremadura palette tokens, no new hues.

Rules:

- Tokens are centralized in packages/ui-tokens (or equivalent).
- Any color use must map to an approved token.
- No raw hex colors in app code except inside the token package.

Fitness functions:

```bash
pnpm -r run tokens:check
pnpm -r run lint:styles
```

Where:

- tokens:check fails if it detects hex colors outside token files
- lint:styles fails if Tailwind class usage violates conventions

## 4) Internationalization objective

Objective: Production-grade i18n without React-only tooling.

Rules:

- Use i18next core (not react-i18next) and Astro or Solid-compatible bindings.
- Translations must be externalized (no inline hardcoded UI strings in components).

Fitness functions:

```bash
pnpm -r run i18n:extract
pnpm -r run i18n:validate
```

## 5) Security objective no secrets protect PII sessions HTTPS

Objective: No secrets in repo; session and PII protected; HTTPS enforced in prod; secure defaults.

Rules:

- No secrets committed: keys tokens credentials forbidden.
- PII minimized; do not log PII.
- Session cookies require Secure HttpOnly SameSite.
- HTTPS assumed in production (Spin TLS termination or upstream gateway), dev uses local TLS when feasible.

Fitness functions:

```bash
gitleaks detect --no-git -v
pnpm -r run sec:lint
pnpm -r run test:security
```

Dependency audit gate:

```bash
pnpm -r audit --audit-level=high
```

## 6) Real-time objective WebSocket MQTT

Objective: Real-time updates through WebSocket or MQTT with non-blocking async, compatible with Spin WASM constraints.

Rules:

- Use a message broker or gateway that is Spin-compatible.
- Frontend subscribes via WebSocket or MQTT only from allowed contexts (Solid islands), not from purely static pages.

Fitness functions:

```bash
pnpm -r run test:realtime
pnpm -r run e2e -- --grep "realtime"
```

## 7) Backend objective Hexagonal DDD CQRS Event Sourcing Rust

Objective: Rust backend is hexagonal, event-sourced, CQRS; async Tokio; Serde; small files and focused units.

Rules:

- Tokio for async I/O
- Serde for serialization
- File max lines: 300
- Functions and types small and single-purpose
- No blocking calls on async paths
- Event store model clearly separated from read models

Fitness functions:

```bash
cargo fmt --check
cargo clippy --all-targets --all-features -D warnings
cargo test --all
cargo deny check
cargo audit
```

File length gate:

```bash
python - << 'PY'
import os
bad=[]
for root,_,files in os.walk("src"):
  for f in files:
    if f.endswith((".rs",".ts",".tsx",".astro",".css")):
      p=os.path.join(root,f)
      n=sum(1 for _ in open(p,"rb"))
      if n>300: bad.append((n,p))
if bad:
  print("Files >300 lines:")
  for n,p in sorted(bad, reverse=True): print(n,p)
  raise SystemExit(1)
print("OK")
PY
```

## 8) WASM and Spin objective

Objective: All deployable services run in WASM under Spin operator and Fermyon.

Rules:

- Build targets produce wasm artifacts and Spin manifest entries.
- Static assets served through Spin HTTP components.

Fitness functions:

```bash
spin doctor
spin build
spin up --test
wasm-tools validate target/wasm32-wasi/release/*.wasm
```

Optional optimization gate:

```bash
wasm-opt -Oz -o /tmp/out.wasm target/wasm32-wasi/release/app.wasm
```

## 9) CI CD objective Taskfile as interface

Objective: Everything runnable via Taskfile targets; CI uses same targets locally.

Rules:

- Root Taskfile.yml exposes canonical targets:

  - task dev
  - task lint
  - task test
  - task build
  - task sec
  - task spin:build
  - task spin:test
  - task ci aggregates all gates

- CI is green only if task ci passes.

Fitness functions:

```bash
task -l
task ci
```

## 10) No hallucinated scope rule

Objective: Do not introduce extra features or dependencies beyond what is specified.

Fitness functions:

```bash
pnpm -r why react && exit 1 || true
pnpm -r why bun && exit 1 || true
pnpm -r list --depth 0
```
