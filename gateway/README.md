# Gateway (Rust + Spin)

This directory contains the gateway layer that fronts backend services.

## Structure

```
gateway/
 spin.toml
 Caddyfile
 api-gateway/
 api-gateway-core/
 edge-proxy/
 Cargo.toml
```

## Build and run

```bash
cd gateway
rustup target add wasm32-wasip1
spin build
spin up
```

## Configuration

- Gateway-related environment variables are documented in `gateway/Cargo.toml` under `[workspace.metadata.env]`.
- Configure secrets via your runtime/Spin variables; do not commit secrets.
