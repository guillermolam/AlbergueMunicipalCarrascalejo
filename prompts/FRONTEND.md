## 📦 Prompt for Refactoring React into Microfrontends (for LLM)

You are a software architect assisting with the transformation of a monolithic React application into a modular, modern microfrontend architecture.

Refactor **all React components and pages** in this project to follow the **microfrontend paradigm**, where:

* Each domain feature (e.g., Auth, Dashboard, Booking, Settings) becomes a **separate independently built React app**
* Each microfrontend is deployed as a standalone build artifact
* Use **Bun** for assembling and orchestrating microfrontends at dev/runtime
* Use **npm** to build, transpile, and publish each microfrontend to the final `dist/` folder
* Ensure the output is compatible with **Spin and Fermyon deployments**, i.e.:

  * The final `dist/` folders must be usable as static assets for Spin HTTP components
  * Each microfrontend can be served independently or mounted via routing within a Spin app
  * Keep routing isolated, with base paths (`/auth`, `/dashboard`, etc.) clearly scoped for use with `spin.toml`

### 🧱 Architecture Requirements

1. **Modularization**

   * Split monolithic components/pages into feature-based microfrontends
   * Each should have its own `vite.config.ts`, `package.json`, and routing boundaries

2. **Integration**

   * Create a **shell application** (host) that dynamically imports or routes to microfrontends
   * Support both **static imports** (at build) and **dynamic federated loading** (if needed)
   * For **Spin**, bundle each microfrontend as a static web app under its route

3. **Tooling**

   * Use **Bun** to run dev servers and manage workspace orchestration
   * Use **npm** scripts (`npm run build`, `npm run dev`, etc.) to build and transpile to `dist/`
   * Ensure final `dist/` folders are compatible with `spin_static_files = ["dist"]` and routing in `spin.toml`

4. **Best Practices**

   * Apply **SOLID principles** to components and logic
   * Follow **Clean Architecture** for separation of concerns (UI, state, logic, service)
   * Use **functional React** components with hooks (no class components)
   * Ensure **reactive, non-blocking** UI (no sync waits or state bloat)
   * Use **modular CSS**, TailwindCSS, or CSS-in-JS with clear scoping
   * Apply **code splitting** and **lazy loading** where needed

5. **Component Refactoring and Reusability**

   * Refactor all UI elements in the console and registration flows into **small, independently testable components**:

     * **ID Verification Component**: camera or file-based upload, validation status UI, with fallback rendering logic. This component must support all valid Spanish and European ID formats, including but not limited to:

       * **DNI** (Documento Nacional de Identidad)
       * **NIE** (Número de Identidad de Extranjero)
       * **NIF** (Número de Identificación Fiscal)
       * **Passport numbers**
       * **EU-format residence permits**
       * **CIF** (for companies, if applicable)
       * Perform format validation, checksum verification, and country-specific rules for each case.
     * **Phone Input with Country Selector**: includes international dialing codes and flag icons (with proper rendering for Valencian, Catalan, Galician, and Basque regional flags)
     * **Stay Date Selector**: calendar picker with localized date formats
     * **Address Component with Google Places API**: clean autocomplete UX, country restrictions, and full address object mapping
     * **Language Selector**: supports international and regional languages including support for country/regional flags (e.g., Catalonia, Valencia, Galicia, Basque Country)
   * Each of the above must:

     * Be **independently reusable** (i.e., no external form logic coupling)
     * Be published to a **GitHub registry** as a versioned component package
     * Include **100% test coverage** through `Vitest`, Playwright, or equivalent frameworks
     * Render without mocked data — use actual API integrations or test environments during testing
     * Be used only in production once fully wired with live data (no hardcoded placeholders or mocks)

6. **Quality**

   * Ensure each microfrontend and reusable component is **independently testable**
   * Use `Vitest`, `httpc-test`, or Playwright for integration and UI testing
   * Lint and format code according to modern ESLint + Prettier + Trunk.io standards
   * Validate that **production builds have no mocked or hardcoded values** and reflect real data integrations or test environments

### ✳️ Deliverables

* A rewritten folder structure like:

```
apps/
  shell/              # Shell/host app
  auth/
  dashboard/
  booking/
packages/
  ui/                 # Shared UI components
  config/             # Shared Vite and Tailwind configs
  components/         # Reusable publishable React components (with GitHub registry support)
dist/                 # Final static output from all microfrontends
```

* Updated `bunfig.toml` or workspace runner config (e.g. `Taskfile`)
* Each app must have its own:

  * `vite.config.ts`
  * `tsconfig.json`
  * `index.html`
  * `App.tsx`
  * `routes.tsx` or similar
* Each reusable component must include:

  * Unit + integration tests with 100% coverage
  * A README with usage, props, and expected behavior
  * A `package.json` configured for GitHub/npm publishing
* Shared logic and UI must be extracted into reusable libraries (packages/ui, packages/hooks, etc.)
* The output of each microfrontend must work with **Spin’s static file serving model** and integrate cleanly with **Spin’s routing and deployment lifecycle**

Please output the full updated folder structure, refactored component examples, Vite configs, and Bun/npm scripts.

Ensure the final structure adheres to **best practices for microfrontends**, **reactive UI**, **clean code principles**, and **Spin/Fermyon compatibility**.
