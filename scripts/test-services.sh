#!/bin/bash
set -e

# Centralized testing script for all services
# Usage: ./scripts/test-services.sh [test_type] [service]

TEST_TYPE="${1:-unit}"
SERVICE="${2:-all}"
COVERAGE_DIR="coverage"

echo "🧪 Running tests: $TEST_TYPE (service: $SERVICE)"

run_rust_tests() {
    local service_dir="$1"
    local service_name="$2"
    local test_type="$3"
    
    if [[ -f "$service_dir/Cargo.toml" ]]; then
        echo "🧪 Testing $service_name..."
        cd "$service_dir"
        
        case $test_type in
            "unit")
                cargo test
                ;;
            "integration")
                cargo test --test integration
                ;;
            "coverage")
                if command -v cargo-tarpaulin &> /dev/null; then
                    cargo tarpaulin --out html --output-dir "../$COVERAGE_DIR/$service_name"
                else
                    echo "⚠️  cargo-tarpaulin not found, installing..."
                    cargo install cargo-tarpaulin
                    cargo tarpaulin --out html --output-dir "../$COVERAGE_DIR/$service_name"
                fi
                ;;
        esac
        
        cd - > /dev/null
        echo "✅ $service_name tests completed"
    fi
}

run_frontend_tests() {
    local frontend_dir="$1"
    local service_name="$2"
    local test_type="$3"
    
    if [[ -f "$frontend_dir/package.json" ]]; then
        echo "🎮 Testing $service_name frontend..."
        cd "$frontend_dir"
        
        case $test_type in
            "unit")
                if command -v bun &> /dev/null && npm run test --silent 2>/dev/null; then
                    bun run test
                elif npm run test --silent 2>/dev/null; then
                    npm run test
                else
                    echo "⚠️  No test script found for $service_name"
                fi
                ;;
            "coverage")
                if command -v bun &> /dev/null; then
                    bun add -D @vitest/coverage-v8 2>/dev/null || true
                    bun run test --coverage --coverage.reporter=html --coverage.reporter=text
                elif command -v npm &> /dev/null; then
                    npm install -D @vitest/coverage-v8 2>/dev/null || true
                    npm run test -- --coverage --coverage.reporter=html --coverage.reporter=text
                fi
                ;;
        esac
        
        cd - > /dev/null
        echo "✅ $service_name frontend tests completed"
    fi
}

clean_coverage() {
    echo "🧹 Cleaning coverage reports..."
    rm -rf "$COVERAGE_DIR"
    echo "✅ Coverage reports cleaned"
}

generate_coverage_summary() {
    echo "📊 Generating coverage summary..."
    
    if [[ -d "$COVERAGE_DIR" ]]; then
        echo "Coverage reports generated in:"
        find "$COVERAGE_DIR" -name "index.html" -type f | while read file; do
            echo "  - $(dirname "$file")"
        done
    else
        echo "⚠️  No coverage reports found"
    fi
}

case $TEST_TYPE in
    "unit")
        case $SERVICE in
            "rust"|"backend")
                cargo test --workspace
                ;;
            "frontend")
                run_frontend_tests "frontend" "Main" "unit"
                run_frontend_tests "backend/auth-service/app" "Auth" "unit"
                ;;
            "all")
                cargo test --workspace
                run_frontend_tests "frontend" "Main" "unit"
                run_frontend_tests "backend/auth-service/app" "Auth" "unit"
                ;;
            *)
                run_rust_tests "$SERVICE" "$SERVICE" "unit"
                ;;
        esac
        ;;
    "integration")
        echo "🔧 Running integration tests..."
        if [[ -f "tests/integration" ]]; then
            cargo test --test integration
        else
            echo "⚠️  No integration tests found"
        fi
        ;;
    "coverage")
        case $SERVICE in
            "rust"|"backend")
                run_rust_tests "." "Workspace" "coverage"
                ;;
            "frontend")
                run_frontend_tests "frontend" "Main" "coverage"
                run_frontend_tests "backend/auth-service/app" "Auth" "coverage"
                ;;
            "all")
                mkdir -p "$COVERAGE_DIR"
                run_rust_tests "." "Workspace" "coverage"
                run_frontend_tests "frontend" "Main" "coverage"
                run_frontend_tests "backend/auth-service/app" "Auth" "coverage"
                generate_coverage_summary
                ;;
            *)
                run_rust_tests "$SERVICE" "$SERVICE" "coverage"
                ;;
        esac
        ;;
    "clean")
        clean_coverage
        ;;
    *)
        echo "❌ Unknown test type: $TEST_TYPE"
        echo "Available types: unit, integration, coverage, clean"
        echo "Available services: rust, frontend, all, or specific service name"
        exit 1
        ;;
esac