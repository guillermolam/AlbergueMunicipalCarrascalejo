## What “embedded replicas” means for this repo
- **Target behavior (per Turso docs):** local file is the primary DB your app reads from; the app periodically (or manually) syncs from a remote Turso primary. Writes normally go to the remote primary and local is updated afterwards.
- **Critical constraint:** Turso explicitly warns: **do not open the local replica file while it is syncing**, or you risk corruption. That means we must **not** have SQLx/SeaORM opening `replica.db` at the same time libsql is syncing it.

## Design choice
- **Use libsql for the embedded-replica DB access path** (same connection API Turso expects), not SeaORM/SQLx.
- Keep **SeaORM migrations** for local dev/CI SQLite files (non-replicated), but **apply schema changes to Turso via a libsql-only migrator**.

## Implementation plan
### 1) Split responsibilities into two libsql-only binaries
- **`albergue-turso-migrate` (new):**
  - Connects to the remote Turso DB using `libsql::Builder::new_remote(url, token)`.
  - Applies schema migrations as SQL (baseline + incremental) and records them in `_albergue_migrations`.
  - Commands: `status`, `up`.
- **`albergue-turso-sync` (existing):**
  - Keeps doing `new_remote_replica(local_path, remote_url, token)` and `db.sync()`.
  - Add `--interval` (or env var) to run periodic sync.

### 2) Add a “baseline schema SQL” that matches current SeaORM migrations
- Generate and commit a **single baseline SQL** that creates all current tables + indexes + the synthetic admin seed.
- Optionally later split into numbered SQL files, but baseline is enough to “get migrations ready” for Turso.

### 3) Add a libsql persistence path for runtime (embedded replica)
- Introduce a small crate/module (e.g. `persistence_libsql`) that:
  - Builds an embedded replica `Database` and returns a `libsql::Connection`.
  - Provides minimal query helpers the app needs.
- Keep existing SeaORM persistence intact for `DATABASE_URL=sqlite://...` local mode.

### 4) Wire a safe operational workflow
- **Bootstrap Turso DB:**
  1) Run `albergue-turso-migrate up` (remote schema).
  2) Run `albergue-turso-sync sync` (pull to local file).
  3) Start app using libsql embedded replica (reads local, writes remote).
- **Deploy schema change:**
  1) Stop app (or ensure no local file is open).
  2) Run `albergue-turso-migrate up`.
  3) Start app; first startup runs `sync` once, then periodic sync.

### 5) Verification
- Add tests that:
  - Apply the baseline SQL to a local libsql database (`Builder::new_local(":memory:")`) and verify tables exist.
  - Keep existing `albergue-migration` smoke tests passing.

## Environment variables (proposed)
- `TURSO_DATABASE_URL=libsql://…`
- `TURSO_AUTH_TOKEN=…`
- `TURSO_REPLICA_PATH=albergue.local.db`
- `TURSO_SYNC_INTERVAL_SECONDS=60` (optional)

## Notes about offline writes
- Embedded replicas support writing to remote by default; “offline/local writes then push” depends on the client’s offline-write support and conflict strategy. We can plan for it, but we’ll implement the safe baseline first: **remote writes + periodic pull sync**.

If you approve, I’ll implement: the new migrator binary, the baseline SQL, the updated sync binary, and tests.