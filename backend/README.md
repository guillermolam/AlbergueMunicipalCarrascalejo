# Backend (Rust + Spin)

This directory is a Cargo workspace containing Spin-compatible Rust services compiled to WebAssembly.

## Workspace members

The workspace members are defined in `backend/Cargo.toml`.

- `shared`
- `auth-service`
- `booking-service`
- `document-validation-service`
- `info-on-arrival-service`
- `location-service`
- `notification-service`
- `rate-limiter-service`
- `redis-service`
- `reviews-service`
- `security-service`

## Build, lint, test

```bash
cd backend
cargo fmt
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace
```

## Build and run a service with Spin

Each service has its own `spin.toml`. The common pattern is:

```bash
cd backend/<service>
rustup target add wasm32-wasip1
spin build
spin up
```

## Configuration

Services load configuration from environment variables and/or Spin variables.

- Look for `spin.toml` (allowed outbound hosts, build commands, routes)
- Look for `src/config.rs` (env var names and defaults)

Do not commit secrets to the repository.