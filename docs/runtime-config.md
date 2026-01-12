# Runtime Configuration (Spin variables + Redis-backed KV store)

## Environment variable provider (application variables)
Spin reads application variables from the Spin process environment, using the prefix `SPIN_VARIABLE_` and uppercased keys.

Example (bash):

```bash
export SPIN_VARIABLE_REDIS_ADDRESS="redis://default:<PASSWORD>@redis-19061.c339.eu-west-3-1.ec2.cloud.redislabs.com:19061"
export SPIN_VARIABLE_REDIS_URL="redis://default:<PASSWORD>@redis-19061.c339.eu-west-3-1.ec2.cloud.redislabs.com:19061"
export SPIN_VARIABLE_DATABASE_URL="postgres://..."
export SPIN_VARIABLE_NEON_DATABASE_URL="postgres://..."
export SPIN_VARIABLE_ENCRYPTION_KEY="..."
```

If a `.env` file exists in your current directory, Spin will also read `SPIN_VARIABLE_...` entries from there (lower priority than real env vars).

## Key Value Store runtime configuration (default store backed by Redis)
Spin’s SDK `key_value::Store::open("default")` uses Spin’s built-in KV store. You can switch its backing storage to Redis at runtime using a runtime config file:

1. Copy the template:

```bash
cp runtime-config.example.toml runtime-config.toml
```

2. Replace `<REPLACE_PASSWORD>` in `runtime-config.toml`.

3. Run Spin with the runtime config:

```bash
spin up --runtime-config-file runtime-config.toml
```

Notes:
- `runtime-config.toml` is intentionally ignored by git.
- The gateway uses outbound Redis via `spin_sdk::redis` for rate limiting / caching, which is configured via the `redis_address` variable.

