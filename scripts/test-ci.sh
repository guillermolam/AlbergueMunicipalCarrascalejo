#!/usr/bin/env bash
set -euo pipefail

# CI Test Script - Tests all CI/CD workflow jobs locally
# This script mimics what .github/workflows/ci.yml does

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=========================================="
echo "CI/CD Workflow Local Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED_JOBS=()
PASSED_JOBS=()

run_job() {
    local job_name="$1"
    echo -e "${YELLOW}>>> Running: $job_name${NC}"
    shift
    if "$@"; then
        echo -e "${GREEN}✓ PASSED: $job_name${NC}"
        PASSED_JOBS+=("$job_name")
        return 0
    else
        echo -e "${RED}✗ FAILED: $job_name${NC}"
        FAILED_JOBS+=("$job_name")
        return 1
    fi
}

test_frontend_prettier() {
    cd "$PROJECT_ROOT/frontend"
    pnpm exec prettier --check src/
}

test_frontend_build() {
    cd "$PROJECT_ROOT/frontend"
    pnpm build
    # Verify artifacts exist
    test -f dist/index.html
}

test_gateway_format() {
    cd "$PROJECT_ROOT/gateway"
    just fmt-check
}

test_gateway_clippy() {
    cd "$PROJECT_ROOT/gateway"
    just clippy
}

test_gateway_test() {
    cd "$PROJECT_ROOT/gateway"
    just test
}

test_gateway_build_wasm() {
    cd "$PROJECT_ROOT/gateway"
    cargo build --workspace --release --target wasm32-wasip1
}

test_backend_format() {
    cd "$PROJECT_ROOT/backend"
    just fmt-check
}

test_backend_build() {
    cd "$PROJECT_ROOT/backend"
    just build
}

echo "=========================================="
echo "1. Frontend CI Tests"
echo "=========================================="
echo ""

run_job "Frontend: Prettier Check" test_frontend_prettier || true
run_job "Frontend: Build" test_frontend_build || true

echo ""
echo "=========================================="
echo "2. Gateway CI Tests"
echo "=========================================="
echo ""

run_job "Gateway: Format Check" test_gateway_format || true
run_job "Gateway: Clippy" test_gateway_clippy || true
run_job "Gateway: Unit Tests" test_gateway_test || true
run_job "Gateway: WASM Build" test_gateway_build_wasm || true

echo ""
echo "=========================================="
echo "3. Backend CI Tests"
echo "=========================================="
echo ""

run_job "Backend: Format Check" test_backend_format || true
run_job "Backend: Build" test_backend_build || true

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: ${#PASSED_JOBS[@]}${NC}"
for job in "${PASSED_JOBS[@]}"; do
    echo -e "${GREEN}  ✓ $job${NC}"
done

if [ ${#FAILED_JOBS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed: ${#FAILED_JOBS[@]}${NC}"
    for job in "${FAILED_JOBS[@]}"; do
        echo -e "${RED}  ✗ $job${NC}"
    done
    echo ""
    echo -e "${RED}CI Tests FAILED${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}All CI Tests PASSED!${NC}"
    exit 0
fi
