## Why libsql Is “Excluded” (Root Cause)
When we try to run SeaORM migrations against Turso using the `libsql` crate **in the same binary** as `sea-orm-migration`/SQLx (SQLite), the build fails at link-time with “multiple definition of sqlite3_*”.

That happens because:
- SeaORM migrations (SQLite backend) depend on SQLx SQLite → `libsqlite3-sys` (often compiled/bundled SQLite).
- `libsql` depends on `libsql-ffi` which **also bundles SQLite**.
- The final binary ends up linking **two independent SQLite C implementations**, which is not allowed (duplicate symbols). SQLx explicitly calls out that SQLite linkage is a semver hazard and only one SQLite-native library can exist in the final graph/binary. https://docs.rs/sqlx/latest/sqlx/sqlite/index.html

So `libsql` isn’t being “excluded” by SeaORM; it’s that **mixing libsql + sqlx-sqlite in the same executable causes duplicate SQLite symbols**.

## Goal (Your Priority)
- Create/verify a Turso database using the Turso CLI quickstart.
- Run all SeaORM migrations successfully.
- Verify migration status and schema on Turso.
- Ensure everything is async and runs with no warnings/errors.

## Proposed Solution (Turso-first, but no link conflicts)
We split responsibilities into two separate executables so `libsql` and `sqlx-sqlite` never link together:

1) **turso-sync binary (libsql-only)**
- Uses `libsql` to create/sync a **local SQLite replica file** from Turso.
- Syncs again after migrations to push changes.

2) **migration binary (SeaORM/SQLx-only)**
- Runs SeaORM migrations against the local replica file using `DATABASE_URL=sqlite:///path/to/replica.db`.

This yields a Turso-backed database, while keeping SeaORM migrations intact and compatible.

## Implementation Steps
### 1) Make the migration CLI pure SeaORM
- Remove any `libsql` usage from `crates/migration` binary.
- Ensure `sea-orm-migration` is built with the `cli` feature so `cargo run ... -- up/status/...` works.
- Keep `tracing_subscriber` initialization in the migration main.

### 2) Add a new `crates/turso_sync` (or similar)
- New crate depends on `libsql`, `tokio`, `tracing`, `tracing-subscriber`.
- Commands:
  - `pull`: create/sync local replica from `DATABASE_URL=libsql://...` + `TURSO_AUTH_TOKEN` + `TURSO_REPLICA_PATH`.
  - `push`: sync again after migrations.

### 3) Verify via Turso CLI (quickstart)
- Follow Turso quickstart:
  - `turso auth login`
  - `turso db create albergue` (or desired name)
  - `turso db show albergue` (get the libsql URL)
  - `turso db tokens create albergue`
  - `turso db shell albergue` (connectivity check)

### 4) Run migrations end-to-end
- `turso-sync pull` → local replica file is ready.
- Run SeaORM migrations via **Cargo**:
  - `DATABASE_URL=sqlite:///.../replica.db cargo run -p albergue-migration --manifest-path domain_model/rust/Cargo.toml -- fresh`
  - `... -- status` to validate applied migrations.
- `turso-sync push` to propagate changes.

### 5) Validate status + schema
- In Turso shell:
  - `SELECT * FROM seaql_migrations;` (migration status table)
  - `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`
  - `SELECT * FROM users WHERE username='synthetic_admin';`

### 6) Tracing subscription everywhere
- Ensure all binaries (`albergue-migration`, `albergue-seaography`, new `turso-sync`) initialize `tracing_subscriber` with `EnvFilter`.
- Enable SQL statement visibility by setting env vars:
  - `RUST_LOG=info,sqlx=warn,sea_orm=info,sea_orm_migration=info`

### 7) No-warnings guarantee
- Add CI/local check using `RUSTFLAGS="-D warnings" cargo test ...` for the Rust workspace.

## Acceptance Criteria
- Turso CLI can connect and query the DB.
- Migrations run via:
  - `cargo run -p albergue-migration ... -- up/status/...`
  - `sea-orm-cli migrate -d domain_model/rust/crates/migration up/status/...`
- `status` shows all migrations Applied after `up/fresh`.
- Remote Turso DB contains expected tables and seeded `synthetic_admin`.
- No build warnings or runtime errors.

If you accept this plan, I’ll implement the crate split and run the full Turso + migration + verification sequence.