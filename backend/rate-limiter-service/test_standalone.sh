#!/bin/bash

# Standalone test runner for rate-limiter-service
# This runs tests without workspace dependencies

set -e

echo "🔧 Running Rate Limiter Service Tests"
echo "====================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
	echo -e "${YELLOW}[INFO]${NC} $1"
}

print_success() {
	echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
	echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -f "Cargo.toml" ]]; then
	print_error "Please run this script from the rate-limiter-service directory"
	exit 1
fi

# Clean previous builds
print_status "Cleaning previous builds..."
cargo clean

# Run individual test suites
print_status "Running rate limit algorithm tests..."
if cargo test --test rate_limit_algorithm_tests -- --nocapture; then
	print_success "Rate limit algorithm tests passed"
else
	print_error "Rate limit algorithm tests failed"
	exit 1
fi

print_status "Running unit tests..."
if cargo test --test unit_tests -- --nocapture; then
	print_success "Unit tests passed"
else
	print_error "Unit tests failed"
	exit 1
fi

print_status "Running edge case tests..."
if cargo test --test edge_case_tests -- --nocapture; then
	print_success "Edge case tests passed"
else
	print_error "Edge case tests failed"
	exit 1
fi

print_status "Running performance tests..."
if cargo test --test performance_tests -- --nocapture; then
	print_success "Performance tests passed"
else
	print_error "Performance tests failed"
	exit 1
fi

print_status "Running integration tests..."
if cargo test --test integration_tests -- --nocapture; then
	print_success "Integration tests passed"
else
	print_error "Integration tests failed"
	exit 1
fi

# Run all tests together
print_status "Running all tests..."
if cargo test -- --nocapture; then
	print_success "All tests passed!"
else
	print_error "Some tests failed"
	exit 1
fi

# Build for WASM
print_status "Building for WASM target..."
if cargo build --target wasm32-wasi --release; then
	print_success "WASM build successful"
else
	print_error "WASM build failed"
	exit 1
fi

echo
echo "🎉 All tests completed successfully!"
echo "====================================="
echo
echo "Test Summary:"
echo "- Rate limit algorithm tests: ✅"
echo "- Unit tests: ✅"
echo "- Edge case tests: ✅"
echo "- Performance tests: ✅"
echo "- Integration tests: ✅"
echo "- WASM build: ✅"
