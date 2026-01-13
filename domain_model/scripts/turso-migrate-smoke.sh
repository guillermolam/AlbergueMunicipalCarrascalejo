#!/bin/bash
#!/usr/bin/env bash
set -euo pipefail

TURSO_BIN="${TURSO_BIN:-$HOME/.turso/turso}"
TURSO_GROUP="${TURSO_GROUP:-default}"
TURSO_DB_NAME="${TURSO_DB_NAME:-albergue-migration-smoke}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="$ROOT_DIR/domain_model/rust/Cargo.toml"

mkdir -p "$ROOT_DIR/.turso"
TURSO_REPLICA_PATH="${TURSO_REPLICA_PATH:-$ROOT_DIR/.turso/${TURSO_DB_NAME}.db}"

"$TURSO_BIN" db create --group "$TURSO_GROUP" "$TURSO_DB_NAME" >/dev/null 2>&1 || true

TURSO_DATABASE_URL="$($TURSO_BIN db show "$TURSO_DB_NAME" --url)"
TURSO_AUTH_TOKEN="$($TURSO_BIN db tokens create "$TURSO_DB_NAME")"

rm -f "$TURSO_REPLICA_PATH"

DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" TURSO_REPLICA_PATH="$TURSO_REPLICA_PATH" \
	cargo run -p albergue-turso-sync --manifest-path "$MANIFEST_PATH" >/dev/null

DATABASE_URL="sqlite://$TURSO_REPLICA_PATH" \
	cargo run -p albergue-migration --manifest-path "$MANIFEST_PATH" -- fresh >/dev/null

DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" TURSO_REPLICA_PATH="$TURSO_REPLICA_PATH" \
	cargo run -p albergue-turso-sync --manifest-path "$MANIFEST_PATH" >/dev/null

printf "migrations_remote_count="
"$TURSO_BIN" db shell "$TURSO_DB_NAME" "select count(*) from seaql_migrations;" | tail -n 1

printf "synthetic_admin_present="
"$TURSO_BIN" db shell "$TURSO_DB_NAME" "select count(*) from users where username = 'synthetic_admin';" | tail -n 1
