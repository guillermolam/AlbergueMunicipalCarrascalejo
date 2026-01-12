# Spin HTTP Outbound Compliance Notes

## Why Spin outbound HTTP is special
WASI does not provide a general sockets API, so typical Rust HTTP clients can’t be used inside Wasm guest modules. Spin provides the outbound HTTP interface and Rust apps should use `spin_sdk::http::send`.

## Rules we follow
- All outbound HTTP requests from the gateway use `spin_sdk::http::send`.
- The gateway does not try to set the `Host` header (Spin disallows this).
- Outbound permissions are explicitly declared via `allowed_outbound_hosts` in `spin.toml`.

## Intra-application service chaining
Spin supports calling other components in the same application using the special host:
- `http://<component-id>.spin.internal`

Those calls are passed in memory within the Spin host process. The gateway uses this to call backend services while still enforcing policy middleware at the gateway entrypoint.

To enable this, the gateway component includes:
- `allowed_outbound_hosts = ["http://*.spin.internal", ...]`

