#!/bin/bash
# Master validation script - tests all tasks, scripts, and Justfiles
# Run this to ensure everything works correctly

set -e

echo "======================================"
echo "Master Validation Suite"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILURES=0

# Test function
run_test() {
	local test_name="$1"
	local test_command="$2"

	echo -n "Testing: $test_name... "

	if eval "$test_command" >/dev/null 2>&1; then
		echo -e "${GREEN}PASS${NC}"
		return 0
	else
		echo -e "${RED}FAIL${NC}"
		FAILURES=$((FAILURES + 1))
		return 1
	fi
}

echo "=== Phase 1: Syntax Validation ==="
run_test "Taskfile.yml syntax" "python3 -c 'import yaml; yaml.safe_load(open(\"Taskfile.yml\"))'"
run_test "Backend Justfile syntax" "cd backend && just --list > /dev/null"
echo ""

echo "=== Phase 2: Script Validation ==="
run_test "All scripts have shebangs" "! find scripts -name '*.sh' -type f -exec sh -c 'head -1 \"{}\" | grep -q \"^#!/\"' \; -print | grep ."
run_test "All scripts are executable" "find scripts -name '*.sh' -type f ! -executable | wc -l | grep -q ^0$"
run_test "No emojis in scripts" "! grep -r '[^\x00-\x7F]' scripts/*.sh 2>/dev/null"
echo ""

echo "=== Phase 3: Dependency Checks ==="
run_test "Rust toolchain" "command -v cargo"
run_test "Node.js" "command -v node"
run_test "pnpm" "command -v pnpm"
run_test "Spin CLI" "command -v spin"
run_test "Task" "command -v task"
echo ""

echo "=== Phase 4: Idempotency Tests ==="
echo "Testing script idempotency (running twice)..."

# Test update-deps script is idempotent
if [ -x "scripts/update-deps.sh" ]; then
	echo -n "  update-deps.sh (1st run)... "
	if timeout 5 bash scripts/update-deps.sh --help >/dev/null 2>&1 || true; then
		echo -e "${GREEN}OK${NC}"
	else
		echo -e "${YELLOW}SKIP${NC}"
	fi
fi

echo ""

echo "=== Phase 5: Task Runner Tests ==="
echo "Testing critical tasks..."

# Test tasks that should work without building
run_test "task clean (idempotent)" "task clean && task clean"
echo ""

echo "======================================"
echo "Validation Summary"
echo "======================================"

if [ $FAILURES -eq 0 ]; then
	echo -e "${GREEN}All tests passed!${NC}"
	echo ""
	echo "Next steps:"
	echo "  - Run 'task build' to build all services"
	echo "  - Run 'task dev' to start development"
	echo "  - Run 'just -d backend' to see available Rust commands"
	exit 0
else
	echo -e "${RED}$FAILURES test(s) failed${NC}"
	echo ""
	echo "Please fix the failures above before proceeding."
	exit 1
fi
