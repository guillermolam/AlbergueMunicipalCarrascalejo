#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev-local.sh  —  Start all workers locally for E2E testing with workerd
#
# Usage:
#   ./scripts/dev-local.sh           # start everything
#   ./scripts/dev-local.sh --build   # rebuild Rust workers first, then start
#
# What it starts:
#   1. OCR Worker        → http://localhost:8788   (backend/ocr-service)
#   2. Backend Worker    → http://localhost:8787   (backend/api-service)
#   3. Frontend (Astro)  → http://localhost:4321   (frontend)
#
# The frontend wrangler.jsonc binds OCR_SERVICE → albergue-ocr, so when
# wrangler dev resolves the service binding it points at the OCR worker
# running on port 8788 automatically.
#
# Prerequisites:
#   - wrangler  ≥ 3.x  (npm i -g wrangler)
#   - cargo + worker-build (cargo install worker-build)
#   - pnpm
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OCR_DIR="$ROOT/backend/ocr-service"
BACKEND_DIR="$ROOT/backend/api-service"
FRONTEND_DIR="$ROOT/frontend"

# ── Load root .env (contains CLOUDFLARE_API_TOKEN and other secrets) ──────────
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

# ── Ensure Homebrew + Cargo are on PATH (works for both login and non-login shells) ──
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$HOME/.cargo/bin:$PATH"

# Use the wrangler from frontend node_modules if not globally installed
if ! command -v wrangler &>/dev/null; then
  if [[ -x "$FRONTEND_DIR/node_modules/.bin/wrangler" ]]; then
    export PATH="$FRONTEND_DIR/node_modules/.bin:$PATH"
  fi
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # no colour

log() { echo -e "${CYAN}[dev-local]${NC} $*"; }
warn() { echo -e "${YELLOW}[dev-local] WARNING:${NC} $*"; }

# ── Parse args ────────────────────────────────────────────────────────────────
BUILD=false
for arg in "$@"; do
  case "$arg" in
    --build|-b) BUILD=true ;;
    --help|-h)
      sed -n '2,30p' "$0" | sed 's/^# *//'
      exit 0
      ;;
  esac
done

# ── Resolve wrangler binary ────────────────────────────────────────────────────
# Node v18+ broke the wrangler shim script; always use wrangler.js directly.
WRANGLER_JS="$FRONTEND_DIR/node_modules/wrangler/bin/wrangler.js"
if [[ ! -f "$WRANGLER_JS" ]]; then
  warn "wrangler not found at $WRANGLER_JS. Run: cd frontend && pnpm install"
  exit 1
fi
# Wrapper function so callers write `wrangler_cmd ...` instead of `node "$WRANGLER_JS" ...`
wrangler_cmd() { node "$WRANGLER_JS" "$@"; }

# ── Check Cloudflare auth for Workers AI (OCR service needs remote AI) ────────
# Workers AI cannot run in --local mode — it requires CF's GPU infrastructure.
# wrangler dev WITHOUT --local (workerd mode) routes AI calls to CF's GPU infra.
# Without valid auth the AI binding will fail; OCR returns an error and users
# are prompted to fill the form manually.
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || node "$WRANGLER_JS" whoami &>/dev/null 2>&1; then
  HAVE_CF_AUTH=true
  log "Cloudflare auth found — Workers AI will be used for real OCR."
else
  HAVE_CF_AUTH=false
  warn "No valid Cloudflare auth. Workers AI unavailable — OCR will show a fill-manually prompt."
  warn "For real OCR: run 'wrangler login' or export CLOUDFLARE_API_TOKEN=<your-token>"
  warn "Get a token at: https://dash.cloudflare.com/profile/api-tokens"
fi

# ── Optionally build Rust workers ────────────────────────────────────────────
if [ "$BUILD" = true ]; then
  log "Building OCR service (Rust → WASM)..."
  (cd "$OCR_DIR" && export PATH="$HOME/.cargo/bin:$PATH" && worker-build --release)
  log "Building API service (Rust → WASM)..."
  (cd "$BACKEND_DIR" && export PATH="$HOME/.cargo/bin:$PATH" && worker-build --release)
fi

# ── Apply D1 migrations and seed data locally ─────────────────────────────────
log "Applying D1 migrations: albergue-pilgrims (OCR service)..."
(cd "$OCR_DIR" && wrangler_cmd d1 execute albergue-pilgrims \
  --local --persist-to .wrangler/state \
  --file migrations/001_pilgrim_profiles.sql 2>/dev/null) || \
  warn "D1 migration skipped (albergue-pilgrims may already be initialised)"

log "Applying D1 migrations: albergue-bookings (API service) — schema..."
(cd "$BACKEND_DIR" && wrangler_cmd d1 execute albergue-bookings \
  --local --persist-to .wrangler/state \
  --file migrations/0001_init_schema.sql 2>/dev/null) || \
  warn "D1 migration 0001 skipped (may already be initialised)"

log "Applying D1 migrations: albergue-bookings — accommodation config..."
(cd "$BACKEND_DIR" && wrangler_cmd d1 execute albergue-bookings \
  --local --persist-to .wrangler/state \
  --file migrations/0002_accommodation_config.sql 2>/dev/null) || \
  warn "D1 migration 0002 skipped (may already be initialised)"

log "Seeding D1: albergue-bookings (pilgrims, bookings, services, pricing)..."
(cd "$BACKEND_DIR" && wrangler_cmd d1 execute albergue-bookings \
  --local --persist-to .wrangler/state \
  --file migrations/seed_dev.sql 2>/dev/null) || \
  warn "D1 seed skipped (data may already exist)"

# (OCR service is now a native binary — no D1 needed)

# ── Trap to kill all background processes on exit ────────────────────────────
declare -a PIDS=()
cleanup() {
  log "Shutting down all workers..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

# ── 1. OCR Service (native Rust + Tesseract) ──────────────────────────────────
# Runs as a plain Axum HTTP server — no Cloudflare credentials required.
# Tesseract must be installed: brew install tesseract tesseract-lang
log "Starting OCR service on :8788 (Tesseract, native binary)..."
(cd "$OCR_DIR" && \
  export TESSDATA_PREFIX="/opt/homebrew/share/tessdata" && \
  export PORT=8788 && \
  cargo run --release \
    2>&1 | sed "s/^/${GREEN}[ocr]${NC} /" \
) &
PIDS+=($!)

# Give the OCR worker a moment to boot before starting the frontend
# (so the service binding is available when wrangler resolves it)
sleep 2

# ── 2. Backend Worker ────────────────────────────────────────────────────────
log "Starting backend worker on :8787..."
(cd "$BACKEND_DIR" && \
  wrangler_cmd dev \
    --port 8787 \
    --local \
    --persist-to .wrangler/state \
    2>&1 | sed "s/^/${YELLOW}[backend]${NC} /" \
) &
PIDS+=($!)

sleep 1

# ── 3. Frontend (Astro + wrangler dev) ───────────────────────────────────────
# Ensure the Astro build output (dist/server/entry.mjs) exists before starting
# wrangler — it is the Worker entry point declared in wrangler.jsonc "main".
if [[ ! -f "$FRONTEND_DIR/dist/server/entry.mjs" ]]; then
  log "Frontend not built yet — running pnpm build..."
  (cd "$FRONTEND_DIR" && pnpm build 2>&1 | sed "s/^/${CYAN}[build]${NC} /" )
  log "Frontend build complete."
fi

log "Starting frontend on :4321 with PUBLIC_API_MODE=real..."
(cd "$FRONTEND_DIR" && \
  PUBLIC_API_MODE=real \
  PUBLIC_API_URL=http://localhost:8787 \
  PUBLIC_OCR_SERVICE_URL=http://localhost:8788 \
  wrangler_cmd dev \
    --port 4321 \
    --local \
    --persist-to .wrangler/state \
    2>&1 | sed "s/^/${CYAN}[frontend]${NC} /" \
) &
PIDS+=($!)

# ── Wait ──────────────────────────────────────────────────────────────────────
log "${GREEN}All services started.${NC}"
echo ""
echo "  Frontend  → http://localhost:4321"
echo "  Backend   → http://localhost:8787"
echo "  OCR       → http://localhost:8788"
echo ""
echo "Press Ctrl-C to stop all services."
echo ""

wait
