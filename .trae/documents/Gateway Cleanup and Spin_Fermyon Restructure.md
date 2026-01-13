## What’s Actually In Use Today

- **Canonical app manifest:** the repo root [spin.toml](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/spin.toml) now defines the frontend, gateway, and all backend components.
- **Active gateway implementation:** [gateway/api-gateway](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/api-gateway) is the real Spin HTTP gateway used by the root manifest.
- **Legacy/duplicate manifests:** [gateway/spin.toml](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/spin.toml) and [frontend/spin.toml](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/frontend/spin.toml) are standalone manifests that are no longer the canonical entrypoint.
- **Legacy BFF crate:** [gateway/api](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/api) (package name `bff`) is **not referenced** by the root manifest, but **tests/docs/scripts still refer** to an older `gateway/bff` layout.
- **Native edge proxy:** [gateway/edge-proxy](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/edge-proxy) is a valid optional native tool (not a Spin component).

## Recommendation (Best Spin/Fermyon Practice)

- Keep **one canonical Spin application manifest at repo root**.
- Keep **Spin components as separate Rust crates** (gateway + backend services). This matches Spin’s trigger/component model.
- Keep native tooling (edge TLS proxy) **separate from Spin components** (either keep it under `gateway/edge-proxy` as “infra tool”, or move it to `tools/edge-proxy`).
- Remove legacy/duplicated gateway-BFF code and references to avoid confusion and failing tests.

## Concrete Changes I Will Implement

### 1) Remove Legacy Gateway-BFF (`gateway/api`)

- Delete [gateway/api](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/api) and its tests if it’s not used by the root manifest.
- Update any references that expect `gateway-bff` (tests, taskfiles, docs) to point to the current gateway (`api-gateway`).

### 2) Make Root `spin.toml` the Only Canonical Manifest

- Either delete or move these to `examples/` or `docs/examples/`:
  - [gateway/spin.toml](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/spin.toml)
  - [frontend/spin.toml](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/frontend/spin.toml)
- Update test harnesses that currently read `gateway/spin.toml` to read the root manifest.

### 3) Clean Up Docs and Scripts

- Rewrite or replace [gateway/README.md](file:///c:/Users/guill/Documents/GitHub/AlbergueMunicipalCarrascalejo/gateway/README.md) (currently describes `gateway/bff` which doesn’t exist).
- Update `taskfiles/*` and `tests/*` that reference `gateway/bff` or `gateway/spin.toml` so they reflect the new structure.

### 4) Decide What To Do With `edge-proxy`

- Keep it (recommended): it’s useful for local/custom TLS termination outside Fermyon.
- Optional improvement: move it to `tools/edge-proxy` and adjust `gateway/Cargo.toml` workspace membership accordingly.

### 5) Verification

- Run lint/diagnostics and search for dangling paths:
  - Ensure no references to removed folders remain.
  - Run Rust checks/tests for the remaining gateway crates.
  - Validate `spin.toml` shape with `spin doctor` (if available in your environment).

## Outcome

- `gateway/` becomes simple and Spin-aligned:
  - `gateway/api-gateway` (only Spin gateway component)
  - optional `gateway/edge-proxy` (native infra tool)
  - no legacy `gateway/api` BFF
  - no confusing duplicate manifests (or moved to examples)
  - tests/docs/scripts updated to the canonical root app.
