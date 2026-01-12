# Gateway (Rust + Spin)

This directory contains the gateway layer that fronts backend services.

## Structure

```
gateway/
 spin.toml
 Caddyfile
 api-gateway/          # Spin component (HTTP)
 api-gateway-core/     # Shared core library
 edge-proxy/           # Spin component (edge/policy)
 Cargo.toml            # Cargo workspace
```

## Build and run

```bash
cd gateway
rustup target add wasm32-wasip1
cargo build --workspace --target wasm32-wasip1 --release
spin build
spin up
```

## Configuration

- Gateway-related environment variables are documented in `gateway/Cargo.toml` under `[workspace.metadata.env]`.
- Configure secrets via your runtime/Spin variables; do not commit secrets.