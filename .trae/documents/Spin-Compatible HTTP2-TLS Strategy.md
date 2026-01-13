## Reality Check (Spin/Fermyon Cloud)

- Spin HTTP components do not run an inbound TCP listener you control; the platform host delivers requests via WASI HTTP. That means you cannot “switch the server” to Hyper, nor terminate TLS inside the component.
- Tokio as a runtime is not something you run inside a Spin HTTP component the way you do in native Rust; the async execution is provided by Spin/wasmtime + the Spin SDK.
- TLS/HTTP2/IPv6 are typically handled by Fermyon Cloud’s edge/ingress. Inside the component you can (and should) handle L7 policy (auth, rate limits, caching, circuit breaking, security headers) and propagate trace context.

## About Sōzu Compatibility

- Sōzu is a native reverse proxy with TLS termination (Rustls) and is designed to be always-on and hot configurable; it is not designed to run as a Spin WASM component.
- Licensing: Sōzu itself is AGPLv3+, which is often a non-starter for embedding into proprietary products or redistributing modified versions.
- Conclusion: Sōzu is not a good “inside Spin” option; it’s an “outside Spin edge proxy” option.

## Best Architecture Options

### Option A (Recommended for Fermyon Cloud)

- Keep the Spin gateway as the policy-composition layer (auth/headers/cache/rate-limit/circuit-breaker/observability).
- Let Fermyon Cloud handle TLS + HTTP/2 + IPv6.
- Improve performance inside the gateway by minimizing copies, tightening cache keys, and tuning policies—without changing the server stack.

### Option B (If you need custom TLS/HTTP2 behavior beyond Fermyon’s edge)

- Add an external native “edge proxy” in front of Spin:
  - Use Hyper + Tokio + Rustls (or reuse rpxy) for TLS termination, HTTP/2, etc.
  - Forward to the Spin app origin (Fermyon Cloud URL) over HTTPS.
- Keep Spin gateway for per-service policies, and ensure trace context headers are preserved.

## Concrete Implementation Plan in This Repo

1. Add a new native workspace member (e.g., `edge-proxy/`) that uses Hyper + Tokio + Rustls for TLS termination + HTTP/2 and forwards to the Fermyon Cloud endpoint.
2. Keep the existing Spin gateway as-is for service composition and YAML policy controls.
3. Add a small “deployment wiring” document describing:
   - When to use Fermyon edge only (Option A)
   - When to deploy edge-proxy (Option B)
   - How to configure allowed origins/headers during test.
4. Add smoke tests:
   - Direct Spin gateway (HTTP)
   - Through edge-proxy (HTTPS/HTTP2) if Option B enabled.

## Decision Guidance

- If your target is Fermyon Cloud only: Option A is simplest and correct.
- If you need strict custom TLS behavior (mTLS, custom cipher suites, HTTP/3): Option B, with a native edge proxy (rpxy is a closer fit than Sōzu here).
