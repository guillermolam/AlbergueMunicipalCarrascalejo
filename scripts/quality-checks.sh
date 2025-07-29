#!/bin/bash
set -e

# Centralized quality checks script
# Usage: ./scripts/quality-checks.sh [check] [target]

CHECK="${1:-all}"
TARGET="${2:-all}"

echo "📊 Running quality checks: $CHECK (target: $TARGET)"

format_rust() {
    echo "📝 Formatting Rust code..."
    if command -v cargo &> /dev/null; then
        cargo fmt --all
        echo "✅ Rust code formatted"
    else
        echo "⚠️  Cargo not found, skipping Rust formatting"
    fi
}

format_frontend() {
    local target_dir="$1"
    local service_name="$2"
    
    if [[ -f "$target_dir/package.json" ]]; then
        echo "🎨 Formatting $service_name frontend..."
        cd "$target_dir"
        
        if command -v bun &> /dev/null && npm run format --silent 2>/dev/null; then
            bun run format
        elif npm run format --silent 2>/dev/null; then
            npm run format
        elif command -v prettier &> /dev/null; then
            prettier --write .
        else
            echo "⚠️  No format script found for $service_name"
        fi
        
        cd - > /dev/null
        echo "✅ $service_name frontend formatted"
    fi
}

lint_rust() {
    echo "🚨 Linting Rust code..."
    if command -v cargo &> /dev/null; then
        cargo clippy --all-targets --all-features -- -D warnings
        echo "✅ Rust code linted"
    else
        echo "⚠️  Cargo not found, skipping Rust linting"
    fi
}

lint_frontend() {
    local target_dir="$1"
    local service_name="$2"
    
    if [[ -f "$target_dir/package.json" ]]; then
        echo "🔍 Linting $service_name frontend..."
        cd "$target_dir"
        
        if command -v bun &> /dev/null && npm run lint --silent 2>/dev/null; then
            bun run lint
        elif npm run lint --silent 2>/dev/null; then
            npm run lint
        else
            echo "⚠️  No lint script found for $service_name"
        fi
        
        cd - > /dev/null
        echo "✅ $service_name frontend linted"
    fi
}

security_audit() {
    echo "🔒 Running security audit..."
    
    # Rust security audit
    if command -v cargo &> /dev/null; then
        if command -v cargo-audit &> /dev/null; then
            cargo audit
        else
            echo "⚠️  cargo-audit not found, installing..."
            cargo install cargo-audit
            cargo audit
        fi
    fi
    
    # Node.js security audit
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        if command -v bun &> /dev/null; then
            bun audit || echo "⚠️  Bun audit not available"
        elif command -v npm &> /dev/null; then
            npm audit || echo "⚠️  NPM audit issues found"
        fi
        cd - > /dev/null
    fi
    
    echo "✅ Security audit completed"
}

case $CHECK in
    "format")
        case $TARGET in
            "rust"|"backend")
                format_rust
                ;;
            "frontend")
                format_frontend "frontend" "Main"
                format_frontend "backend/auth-service" "Auth"
                ;;
            "all")
                format_rust
                format_frontend "frontend" "Main"
                format_frontend "backend/auth-service" "Auth"
                ;;
        esac
        ;;
    "lint")
        case $TARGET in
            "rust"|"backend")
                lint_rust
                ;;
            "frontend")
                lint_frontend "frontend" "Main"
                lint_frontend "backend/auth-service" "Auth"
                ;;
            "all")
                lint_rust
                lint_frontend "frontend" "Main"
                lint_frontend "backend/auth-service" "Auth"
                ;;
        esac
        ;;
    "security")
        security_audit
        ;;
    "all")
        echo "🏆 Running all quality checks..."
        format_rust
        format_frontend "frontend" "Main"
        format_frontend "backend/auth-service" "Auth"
        lint_rust
        lint_frontend "frontend" "Main"
        lint_frontend "backend/auth-service" "Auth"
        security_audit
        echo "🏆 All quality checks completed"
        ;;
    *)
        echo "❌ Unknown check: $CHECK"
        echo "Available checks: format, lint, security, all"
        echo "Available targets: rust, frontend, all"
        exit 1
        ;;
esac