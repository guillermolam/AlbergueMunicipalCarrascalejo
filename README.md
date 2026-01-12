# Albergue Municipal Carrascalejo

Repository for the Albergue Municipal Carrascalejo system (Camino de Santiago / Vía de la Plata).

- **frontend/**: Astro static frontend
- **backend/**: Rust services compiled to WebAssembly and run on Spin
- **gateway/**: API gateway/BFF layer (Rust + Spin)
- **domain_model/**: Schema baseline + migrations/tooling (SQLite/Turso)

## Repository layout

```
.
 frontend/
 backend/
 gateway/
 domain_model/
 taskfiles/
 scripts/
 tests/
 docs/
```

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

The backend is a Cargo workspace under `backend/`.

```bash
cd backend
cargo test --workspace
```

Example: build and run `auth-service` with Spin:

```bash
cd backend/auth-service
rustup target add wasm32-wasip1
cargo build --target wasm32-wasip1 --release --bin auth
spin build
spin up
```

## Gateway

The gateway is a separate Cargo workspace under `gateway/`.

```bash
cd gateway
cargo test --workspace
spin build
spin up
```

## Documentation

- Architecture and operational docs live under `docs/`
- UX docs live under `docs/ux/`