## 📦 Prompt for Refactoring into Astro + Solid Microfrontends (for LLM)

You are a software architect and frontend engineer transforming a monolithic frontend into a modular, modern **microfrontend architecture** using **Astro + Solid**.

Refactor **all pages and UI** to follow a **microfrontend-by-domain** model where:

- Each domain feature (e.g., **Auth**, **Dashboard**, **Booking**, **Settings**) becomes a **separate independently built Astro app**
- Each microfrontend produces a **standalone static build artifact** (no server required)
- Use **pnpm workspaces** for orchestration and dependencies
- Use **Vite** (via Astro) for dev/build
- Ensure output is compatible with **Spin and Fermyon deployments**:

  - Each microfrontend builds to its own `dist/`
  - Each can be served independently OR mounted under scoped base paths (`/auth`, `/dashboard`, etc.)
  - Routing is isolated per microfrontend and compatible with Spin routing via `spin.toml`
  - Static assets must work with `spin_static_files = ["dist"]`

### 🧱 Architecture Requirements

#### 1) Modularization

- Split the existing monolith into **feature-based microfrontends**
- Each microfrontend must have:

  - its own `astro.config.*`, `vite` integration (through Astro), `tsconfig.json`, and routing boundaries
  - strict base path scoping (`/auth`, `/dashboard`, etc.)

- Shared code must NOT be copy-pasted; extract into packages.

#### 2) Integration (Shell / Host)

- Create a **shell/host app** that:

  - provides top-level navigation, shared layout, and shared design tokens
  - mounts microfrontends via:

    - **static composition** (build-time linking) and/or
    - **runtime composition** (loading microfrontend entry points as static assets under base paths)

- Avoid fragile runtime federation unless explicitly required; prefer static routing boundaries.

#### 3) Tooling

- Package manager: **pnpm only**
- Workspaces: one root `pnpm-workspace.yaml`
- Scripts:

  - `pnpm dev` runs shell + microfrontends concurrently
  - `pnpm build` builds all microfrontends into final `dist/` outputs
  - `pnpm test` runs unit + integration + e2e across apps/packages

- Enforce consistent formatting/linting via modern tooling (ESLint + Prettier and/or Trunk.io if present in repo).

#### 4) UI Engineering Best Practices

- Apply **SOLID** and **Clean Architecture** principles:

  - UI (Astro/Solid components)
  - state and domain logic
  - services/adapters (API clients)

- Use **Solid** for interactivity as islands only; keep pages mostly static where possible.
- Ensure reactive, non-blocking UI and minimal client-side JS.
- Styling:

  - **Tailwind CSS** as baseline
  - **daisyUI** for primitives and theming
  - Use **wired.js-style visuals** and **css-doodle** as optional decorative layers (must be performance-safe and respect reduced motion).

#### 5) Figma-driven implementation (Source of truth)

- Use **Figma** as the visual reference:

  - spacing, typography, colors, component states, breakpoints

- Translate Figma tokens into:

  - Tailwind theme extensions
  - daisyUI theme configuration

- Component names and structure should map clearly to Figma frames/components.

#### 6) Component Refactoring and Reusability (Publishable packages)

Refactor all UI elements in console + registration flows into small, reusable, independently testable components (framework-appropriate):

- **ID Verification Component** (Solid island):

  - camera or file upload, validation status UI, fallback rendering logic
  - supports DNI, NIE, NIF, passport numbers, EU residence permits, CIF (if applicable)
  - performs format validation + checksum + country-specific rules where applicable

- **Phone Input with Country Selector**:

  - intl dialing codes and flags
  - includes regional flags support where required by design (Catalonia, Valencia, Galicia, Basque Country) as _visual assets only_ (no political claims)

- **Stay Date Selector**:

  - localized date formats

- **Address Component with Google Places API**:

  - autocomplete UX, country restrictions, maps full address object

- **Language Selector**:

  - supports international + regional languages per Figma design

Each component must:

- be reusable with minimal coupling (no app-specific global state assumptions)
- live in `packages/components/*` (or similar)
- be publishable to GitHub Packages (versioned)
- include:

  - unit tests (Vitest)
  - integration tests (Vitest + Testing Library where appropriate)
  - e2e tests (Playwright) for critical paths

- have a README: props/events, usage in Astro/Solid, accessibility notes
- contain NO hardcoded mock placeholders in production builds; use live integrations or test environments for tests.

#### 7) Quality Gates

- Every microfrontend and package is independently buildable and testable
- Validate production builds:

  - no mock data in shipped bundles
  - correct base paths
  - correct static asset references for Spin hosting

- Accessibility: keyboard nav, focus management, semantic HTML, reduced motion support
- Performance: minimal JS, image optimization, lazy loading, avoid heavy doodles by default

### ✳️ Deliverables

Provide:

1. A rewritten folder structure like:

```
apps/
  shell/              # Host app (Astro)
  auth/               # Astro app
  dashboard/
  booking/
  settings/
packages/
  ui/                 # shared UI primitives/styles/tokens (Tailwind + daisyUI)
  config/             # shared eslint/prettier/tailwind/ts configs
  components/         # publishable Solid islands + framework-agnostic utilities
  hooks/              # shared Solid hooks (if needed)
dist/                 # final static outputs (per-app dist retained too)
```

2. Root workspace config:

- `pnpm-workspace.yaml`
- root scripts for dev/build/test across all apps

3. For each app:

- `astro.config.*`, `tsconfig.json`, `src/pages/**`, `src/layouts/**`
- base path routing strategy and Spin-friendly static output
- sample page/component code

4. Component examples:

- at least one full example component from the list above with:

  - code, tests, README stub, package publishing config

5. Build orchestration:

- `pnpm` scripts and (optionally) `Taskfile.yml` runner
- produce outputs that can be directly served by Spin static files under base routes

### Output format requirements

- Print the full folder tree
- Provide concrete code snippets for:

  - Astro app layout + routing
  - Solid island component
  - Tailwind + daisyUI theming
  - Vitest + Playwright examples
  - pnpm scripts and workspace config

- Do not introduce new domains, new microfrontends, or extra features not listed here (avoid “hallucinated scope”).

```

```
