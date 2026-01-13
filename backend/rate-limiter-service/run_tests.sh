#!/bin/bash

# Rate Limiter Service Test Runner
# This script runs all tests with coverage reporting

set -e

echo "🚀 Rate Limiter Service Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
	echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
	echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
	echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
	echo -e "${RED}[ERROR]${NC} $1"
}

# Check if cargo is available
if ! command -v cargo &>/dev/null; then
	print_error "Cargo not found. Please install Rust and Cargo."
	exit 1
fi

# Check if we're in the right directory
if [[ ! -f "Cargo.toml" ]]; then
	print_error "Please run this script from the rate-limiter-service directory"
	exit 1
fi

print_status "Cleaning previous build artifacts..."
cargo clean

print_status "Updating dependencies..."
cargo update

print_status "Running unit tests..."
echo
if cargo test --test unit_tests -- --nocapture; then
	print_success "Unit tests passed"
else
	print_error "Unit tests failed"
	exit 1
fi

echo
print_status "Running rate limit algorithm tests..."
echo
if cargo test --test rate_limit_algorithm_tests -- --nocapture; then
	print_success "Rate limit algorithm tests passed"
else
	print_error "Rate limit algorithm tests failed"
	exit 1
fi

echo
print_status "Running edge case tests..."
echo
if cargo test --test edge_case_tests -- --nocapture; then
	print_success "Edge case tests passed"
else
	print_error "Edge case tests failed"
	exit 1
fi

echo
print_status "Running performance tests..."
echo
if cargo test --test performance_tests -- --nocapture; then
	print_success "Performance tests passed"
else
	print_error "Performance tests failed"
	exit 1
fi

echo
print_status "Running integration tests..."
echo
if cargo test --test integration_tests -- --nocapture; then
	print_success "Integration tests passed"
else
	print_error "Integration tests failed"
	exit 1
fi

echo
print_status "Running all tests with coverage..."
echo

# Check if cargo-tarpaulin is available for coverage
if command -v cargo-tarpaulin &>/dev/null; then
	print_status "Running tests with coverage using cargo-tarpaulin..."
	cargo tarpaulin --out Html --output-dir coverage --timeout 120
	print_success "Coverage report generated in coverage/ directory"
else
	print_warning "cargo-tarpaulin not found. Installing..."
	cargo install cargo-tarpaulin

	print_status "Running tests with coverage..."
	cargo tarpaulin --out Html --output-dir coverage --timeout 120
	print_success "Coverage report generated in coverage/ directory"
fi

# Run clippy for code quality
print_status "Running clippy for code quality..."
if cargo clippy -- -D warnings; then
	print_success "Clippy checks passed"
else
	print_warning "Clippy found some warnings (non-critical)"
fi

# Run formatting check
print_status "Checking code formatting..."
if cargo fmt -- --check; then
	print_success "Code formatting is correct"
else
	print_warning "Code formatting issues found. Run 'cargo fmt' to fix."
fi

# Build for WASM target
print_status "Building for WASM target..."
if cargo build --target wasm32-wasi --release; then
	print_success "WASM build successful"
else
	print_error "WASM build failed"
	exit 1
fi

# Run security audit
print_status "Running security audit..."
if command -v cargo-audit &>/dev/null; then
	cargo audit
	print_success "Security audit completed"
else
	print_warning "cargo-audit not found. Consider installing with: cargo install cargo-audit"
fi

echo
echo "🎉 All tests completed successfully!"
echo "==================================="
echo
echo "Test Summary:"
echo "- Unit tests: ✅"
echo "- Algorithm tests: ✅"
echo "- Edge case tests: ✅"
echo "- Performance tests: ✅"
echo "- Integration tests: ✅"
echo "- Coverage report: coverage/index.html"
echo "- WASM build: ✅"
echo
echo "To view coverage report:"
echo "  open coverage/index.html"
echo
echo "To run specific test suites:"
echo "  cargo test --test unit_tests"
echo "  cargo test --test integration_tests"
echo "  cargo test --test performance_tests"
