#!/bin/bash
set -e

echo "🔨 Running Redis Service Tests"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
	echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
	echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
	echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "Cargo.toml" ]]; then
	print_error "Please run this script from the redis-service directory"
	exit 1
fi

# Build the project
echo "🔨 Building project..."
cargo build --target wasm32-wasi --release

# Run unit tests
echo ""
echo "🧪 Running unit tests..."
if cargo test --test unit_tests -- --nocapture; then
	print_status "Unit tests passed"
else
	print_error "Unit tests failed"
	exit 1
fi

# Run clippy for code quality
echo ""
echo "🔍 Running clippy for code quality..."
if cargo clippy -- -D warnings; then
	print_status "Clippy checks passed"
else
	print_warning "Clippy found warnings"
fi

# Run formatting check
echo ""
echo "🎨 Checking code formatting..."
if cargo fmt --check; then
	print_status "Code formatting is correct"
else
	print_warning "Code formatting needs fixing"
	cargo fmt
fi

echo ""
echo "🎉 All tests completed successfully!"
echo ""
echo "Test Summary:"
echo "- Unit tests: ✅ Passed"
echo "- Code quality: ✅ Checked"
echo ""
echo "To run individual test suites:"
echo "  cargo test --test unit_tests"
echo "  cargo test --all"
