# 8. Cross-cutting Concepts

## 8.1 Security and secrets

- No secrets committed to git
- Prefer Spin variables and runtime config
- Treat outbound connectivity as least-privilege and explicit

References:
- [Secrets policy](../security-secrets.md)
- [Runtime configuration](../runtime-config.md)
- [Spin outbound HTTP](../spin-http-outbound-compliance.md)

## 8.2 Configuration

- Application variables are injected via `SPIN_VARIABLE_...`
- Some runtime integrations can be configured via runtime config files

Reference: [Runtime configuration](../runtime-config.md)

## 8.3 Outbound HTTP constraints (Wasm)

Wasm components cannot use regular socket networking; outbound HTTP should use Spin host APIs.

Reference: [Spin outbound HTTP](../spin-http-outbound-compliance.md)

## 8.4 UX and UI tokens

- UX docs live under [docs/ux](../ux/README.md)
- Frontend rules and fitness functions are maintained under `.trae/rules`

## 8.5 Data and persistence

- Embedded replica strategy (Turso/libSQL) is documented as a reference

Reference: [Turso embedded replicas](../TURSO_EMBEDDED_REPLICAS.md)