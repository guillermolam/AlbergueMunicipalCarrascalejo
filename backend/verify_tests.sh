#!/bin/bash

# Quick verification script to test the test setup
# This script runs a quick smoke test to ensure everything is configured correctly

set -e

echo "🔍 Verifying Rate Limiter Service Test Setup"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check function
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# Check if we're in the right directory
if [[ ! -f "Cargo.toml" ]] || ! grep -q "\[workspace\]" Cargo.toml; then
    echo -e "${RED}Error: Please run this script from the backend directory${NC}"
    exit 1
fi

echo "1. Checking Rust installation..."
rustc --version && check "Rust is installed"

echo "2. Checking WASM target..."
rustup target list --installed | grep wasm32-wasi && check "WASM target is installed" || {
    echo -e "${YELLOW}Installing WASM target...${NC}"
    rustup target add wasm32-wasi
}

echo "3. Checking rate-limiter-service structure..."
if [[ -d "rate-limiter-service" ]]; then
    check "rate-limiter-service directory exists"
    
    # Check test files
    test_files=(
        "rate-limiter-service/tests/unit_tests.rs"
        "rate-limiter-service/tests/rate_limit_algorithm_tests.rs"
        "rate-limiter-service/tests/integration_tests.rs"
        "rate-limiter-service/tests/edge_case_tests.rs"
        "rate-limiter-service/tests/performance_tests.rs"
        "rate-limiter-service/run_tests.sh"
        "rate-limiter-service/TESTING.md"
    )
    
    for file in "${test_files[@]}"; do
        if [[ -f "$file" ]]; then
            check "$file exists"
        else
            echo -e "${RED}❌ $file missing${NC}"
        fi
    done
else
    echo -e "${RED}❌ rate-limiter-service directory not found${NC}"
    exit 1
fi

echo "4. Checking Cargo.toml configuration..."
if grep -q "\[dev-dependencies\]" rate-limiter-service/Cargo.toml; then
    check "Test dependencies configured"
else
    echo -e "${RED}❌ Test dependencies not found in Cargo.toml${NC}"
fi

echo "5. Running quick rate-limiter-service test..."
cd rate-limiter-service
if cargo test --test rate_limit_algorithm_tests -- --nocapture > /dev/null 2>&1; then
    check "Rate limit algorithm tests pass"
else
    echo -e "${RED}❌ Rate limit algorithm tests failed${NC}"
fi
cd ..

echo "6. Checking test runner scripts..."
if [[ -x "run_all_tests.sh" ]]; then
    check "run_all_tests.sh is executable"
else
    echo -e "${YELLOW}Making run_all_tests.sh executable...${NC}"
    chmod +x run_all_tests.sh && check "run_all_tests.sh is now executable"
fi

if [[ -x "rate-limiter-service/run_tests.sh" ]]; then
    check "rate-limiter-service/run_tests.sh is executable"
else
    echo -e "${YELLOW}Making rate-limiter-service/run_tests.sh executable...${NC}"
    chmod +x rate-limiter-service/run_tests.sh && check "rate-limiter-service/run_tests.sh is now executable"
fi

echo "7. Checking Taskfile.yml..."
if [[ -f "Taskfile.yml" ]]; then
    check "Taskfile.yml exists"
    if command -v task &> /dev/null; then
        task --version && check "Task is available"
    else
        echo -e "${YELLOW}Task is not installed. Install with: go install github.com/go-task/task/v3/cmd/task@latest${NC}"
    fi
else
    echo -e "${RED}❌ Taskfile.yml not found${NC}"
fi

echo
echo "🎉 Verification Complete!"
echo "======================="
echo
echo "To run tests:"
echo "  ./run_all_tests.sh                    # Run all service tests"
echo "  ./run_all_tests.sh --coverage         # Run with coverage"
echo "  ./run_all_tests.sh --all              # Run all checks"
echo
echo "  cd rate-limiter-service && ./run_tests.sh  # Run rate-limiter tests"
echo
echo "With Taskfile:"
echo "  task test                             # Run all tests"
echo "  task coverage                         # Generate coverage"
echo "  task rate-limiter:test                # Test rate-limiter specifically"
echo
echo "Quick test:"
echo "  cargo test --workspace                # Run all workspace tests"