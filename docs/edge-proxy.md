# Edge Proxy (Hyper + Tokio + Rustls) vs Fermyon Edge

## Why this exists
On Fermyon Cloud, TLS termination, HTTP/2, and IPv6 are typically provided by the platform ingress. A Spin HTTP component receives requests via WASI HTTP; it does not run a TCP listener you can swap to Hyper.

This repository includes a native `edge-proxy` for cases where you want a self-managed edge in front of Fermyon/Spin (custom certificates, local demos, additional edge controls).

## Option A: Fermyon Cloud Only (recommended)
- Browser/client → Fermyon Cloud edge (TLS/HTTP2/IPv6) → Spin app (`spin.toml`) → Spin gateway policy composition → backend services.
- Keep gateway policies in `gateway/api-gateway/config/gateway.toml`.
- The gateway calls backend components using in-memory service chaining via `http://<component-id>.spin.internal`.

## Option B: Native edge-proxy in front of Fermyon
- Browser/client → `edge-proxy` (TLS termination with Rustls, HTTP/2) → Fermyon Cloud origin (HTTPS) → Spin gateway.

### Run edge-proxy
From `gateway/`:

```bash
cargo run -p edge-proxy --release
```

Set environment variables:
- `EDGE_LISTEN_ADDR` (default `0.0.0.0:8443`)
- `EDGE_UPSTREAM_BASE` (required, e.g. `https://<your-app>.fermyon.app`)
- `EDGE_TLS_CERT_PATH` (required, PEM)
- `EDGE_TLS_KEY_PATH` (required, PEM)

Example:

```bash
export EDGE_UPSTREAM_BASE="https://your-app.fermyon.app"
export EDGE_TLS_CERT_PATH="./certs/dev.crt"
export EDGE_TLS_KEY_PATH="./certs/dev.key"
cargo run -p edge-proxy --release
```

Smoke test:

```bash
curl -vk https://127.0.0.1:8443/health
curl -vk https://127.0.0.1:8443/api/health
```

## Why not Sōzu inside Spin?
Sōzu is a native reverse proxy with TLS termination and dynamic configuration, but it is not designed to run as a Spin WASM component. It is also licensed under AGPLv3+ for the proxy itself, which can be incompatible with many redistribution models.

If you want a high-performance Rust edge proxy, deploy it outside Spin and keep the Spin gateway focused on L7 policy (auth, headers, caching, rate limiting, circuit breaking, trace propagation).
