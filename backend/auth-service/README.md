# auth-service (OIDC/OAuth2)

Spin HTTP component providing OIDC/OAuth2 flows and token handling.

- Route: `/api/auth/*` (see `spin.toml`)
- Provider discovery: Logto (primary) and Zitadel (secondary)

## Configuration

Required environment variables:

- `LOGTO_ISSUER_ENDPOINT`
- `LOGTO_APP_ID`
- `LOGTO_APP_SECRET`
- `LOGTO_ORIGIN_URL` (used to build the redirect URI)
- `ZITADEL_DOMAIN`

Optional environment variables:

- `JWT_SECRET` (defaults to empty)
- `TOKEN_TTL` (seconds, default `3600`)

## Build and run

```bash
cd backend/auth-service
rustup target add wasm32-wasip1
cargo build --target wasm32-wasip1 --release --bin auth
spin build
spin up
```

`spin.toml` contains the outbound host allowlist for provider endpoints.