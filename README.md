# Albergue Municipal Carrascalejo

Pilgrim hostel management system for the Camino de Santiago / Via de la Plata.

## Architecture

Multicloud, trunk-based development. Three runtime targets:

| Target                   | Runtime                            | Size limit      | Services                                                                                 |
| ------------------------ | ---------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| **Cloudflare Workers**   | `wasm32-unknown-unknown` (workerd) | 10 MB / worker  | booking, notification, reviews, document-validation, info-on-arrival, location, language |
| **Spin / Fermyon Cloud** | `wasm32-wasip2` (Spin v3.6+)       | 50 MB free tier | gateway, auth, rate-limiter, redis, security                                             |
| **Oracle Cloud (OCI)**   | Docker / ARM (Always Free)         | --              | ocr-service (Tesseract, ML inference)                                                    |

## Repository layout

```
frontend/          Astro 6.x + UnoCSS (presetMini) + Solid.js islands + Alpine.js
backend/           Rust workspace: Workers-target services (worker crate + wrangler)
gateway/           Rust workspace: Spin gateway (api-gateway, api-gateway-core, edge-proxy)
infra/             Terraform / Spacelift (Cloudflare, OCI, Neon)
security/policies/ OPA Rego policy framework (21 rules, enforced via pre-commit hook)
docs/              Arc42 architecture docs, ADRs, reference
tests/             Integration / API tests
taskfiles/         go-task definitions
.github/           CI workflows, agent instructions
GIS/               Geospatial vector data (KML, GPX only -- binaries gitignored)
```

## Design system

Doodled / Hand-Written / Sketched / 3D meets Neo-Brutalism.

- **Palette**: `#FFFFFF` (white), `#00AB39` (green), grey scale (`#111`--`#F5F5F5`), `#000000` (black)
- **Borders**: 2--4 px solid black, no border-radius
- **Shadows**: offset black box-shadows (`4px 4px 0 0 #000`)
- **Fonts**: sketch family (Caveat, Patrick Hand) for headings; IBM Plex for body
- **No emojis, no gradients, no extra colours**

## Banned technologies

| Banned                                                     | Replacement                                       |
| ---------------------------------------------------------- | ------------------------------------------------- |
| Tailwind CSS                                               | UnoCSS `presetMini` (non-Tailwind base)           |
| `presetUno` / `presetWind` / `presetWind3` / `presetWind4` | `presetMini` only                                 |
| daisyUI                                                    | Custom neo-brutalism shortcuts in `uno.config.ts` |
| React / react-dom                                          | Solid.js for interactive islands                  |
| Bun                                                        | pnpm                                              |

## Tooling

- **Node.js** >= 22, **pnpm** 10.x (frontend)
- **Rust** stable + targets: `wasm32-unknown-unknown`, `wasm32-wasip2`
- **Spin CLI** v3.6+ (Fermyon)
- **wrangler** (Cloudflare Workers)
- **Trunk** v1.25+ (lint, format, security -- pre-commit/pre-push)
- **OPA** v1.15+ (Rego policy enforcement -- pre-commit/commit-msg)
- **go-task** (`task -l` for available commands)

## Quick start

```bash
# List all tasks
task -l

# Frontend dev server
cd frontend && pnpm install && pnpm dev

# Run OPA policy tests
opa test security/policies/ -v

# Trunk check
trunk check
```

## Policy enforcement (OPA / Rego)

Every commit is evaluated against `security/policies/*.rego` before it reaches Trunk:

| Policy | Gate  | Description                                           |
| ------ | ----- | ----------------------------------------------------- |
| P001   | error | No Tailwind CSS references                            |
| P002   | error | No unauthorized root directories                      |
| P003   | error | No emojis in source files                             |
| P005   | error | Workers must not import spin-sdk                      |
| P006   | error | Spin services must not import worker crate            |
| P007   | warn  | Conventional commit messages                          |
| P008   | warn  | No lazy stub patterns (TODO: implement, etc.)         |
| P009   | error | No secrets in committed files                         |
| P010   | error | No React anywhere                                     |
| P011   | error | No Tailwind-compat UnoCSS presets                     |
| P012   | error | Trunk-based development (no develop/release branches) |
| P013   | error | Test coverage >= 95%                                  |
| P014   | error | .gitignore integrity                                  |
| P015   | error | security/policies/ read-only for agents               |
| P018   | error | No hiding source from scanners via .gitignore         |
| P019   | error | No mass lint/security suppressions                    |
| P020   | error | No weakening scanner configs without human approval   |
| P021   | error | No deleting test files                                |
| P022   | error | No large files (>50 MB) or banned binary extensions   |

Human override: `OPA_HUMAN_VERIFIED=1 git commit ...`

## CI pipelines

| Workflow             | Trigger                                               | Target                        |
| -------------------- | ----------------------------------------------------- | ----------------------------- |
| `deploy-backend.yml` | Push to `backend/**`                                  | Cloudflare Workers (wrangler) |
| `deploy-spin.yml`    | Push to `gateway/**`, `backend/auth-service/**`, etc. | Fermyon Cloud (spin deploy)   |
| `deploy-ocr.yml`     | Push to `backend/ocr-service/**`                      | OCI ARM (Docker)              |

## Dependency management

Dependabot monitors 7 ecosystems daily/weekly:

| Ecosystem       | Directory                    | Schedule |
| --------------- | ---------------------------- | -------- |
| npm             | `/frontend`                  | daily    |
| Cargo (Rust)    | `/` (workspace)              | daily    |
| GitHub Actions  | `/`                          | daily    |
| Terraform       | `/infra`                     | weekly   |
| Terraform (OCI) | `/infra/modules/oci-compute` | weekly   |
| Go (Terratest)  | `/infra/tests`               | weekly   |
| Docker          | `/backend/ocr-service`       | weekly   |

## Documentation

- [Architecture (arc42)](docs/arc42/README.md)
- [ADRs](docs/adr/README.md)
- [Frontend](frontend/README.md)
- [Backend](backend/README.md)
- [Gateway](gateway/README.md)
- [Tests](tests/README.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE) (Apache 2.0)
