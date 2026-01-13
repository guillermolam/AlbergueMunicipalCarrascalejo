# Albergue Municipal Carrascalejo

Repository for the Albergue Municipal Carrascalejo system (Camino de Santiago / Vía de la Plata).

- **frontend/**: Astro static frontend
- **backend/**: Rust services compiled to WebAssembly and run on Spin
- **gateway/**: API gateway/BFF layer (Rust + Spin)
- **domain_model/**: Schema baseline + migrations/tooling (SQLite/Turso)

## Tooling

- Node.js >= 18
- pnpm (frontend)
- Rust (stable) + `wasm32-wasip1` target
- Spin CLI
- go-task (`task`)

## Quick start

List available tasks:

```bash
task -l
```

Run the default dev pipeline:

```bash
task dev
```

## Readmes

- [Frontend](frontend/README.md)
- [Frontend runtime scripts](frontend/src/scripts/README.md)
- [Backend](backend/README.md)
- [Auth service](backend/auth-service/README.md)
- [Gateway](gateway/README.md)
- [Domain model](domain_model/README.md)
- [Taskfiles](taskfiles/README.md)
- [Scripts](scripts/README.md)
- [Tests](tests/README.md)
- [UX docs](docs/ux/README.md)
- [Documentation hub](docs/README.md)
- [Architecture (arc42)](docs/arc42/README.md)
- [ADRs](docs/adr/README.md)

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

## Backend

Backend components are designed to run under Spin (Wasm). For day-to-day work:

- Build/run a service with Spin from its directory (`spin build`, `spin up`)
- Run focused Rust tests per crate (some binaries are Spin/Wasm-specific)

## Gateway

The gateway is a separate Cargo workspace under `gateway/` and runs under Spin.
