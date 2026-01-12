#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="$ROOT_DIR/domain_model/rust"

DB_PREFIX="${TURSO_TEST_DB_PREFIX:-albergue-ci-}"
DB_NAME="${TURSO_TEST_DB_NAME:-${DB_PREFIX}$(date +%s)}"

cleanup() {
  if command -v turso >/dev/null 2>&1; then
    turso db destroy "$DB_NAME" --yes >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

turso db create "$DB_NAME" >/dev/null

DATABASE_URL="$(turso db show "$DB_NAME" --url)"
TURSO_AUTH_TOKEN="$(turso db tokens create "$DB_NAME")"

cd "$RUST_DIR"

DATABASE_URL="$DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" cargo run -p albergue-turso-sync -- migrate-remote
DATABASE_URL="$DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" cargo run -p albergue-turso-sync -- status-remote | grep -q "Applied"
