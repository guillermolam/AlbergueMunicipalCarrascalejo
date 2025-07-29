#!/bin/bash
set -e

# Centralized Rust cleaning script
# Usage: ./scripts/clean-rust.sh [directory]

TARGET_DIR="${1:-.}"
echo "🔧 Cleaning Rust project in $TARGET_DIR..."

cd "$TARGET_DIR"

# Try cargo clean first
if command -v cargo &> /dev/null && [[ -f "Cargo.toml" ]]; then
    echo "📦 Running cargo clean..."
    cargo clean
    echo "✅ Cargo clean completed"
else
    echo "⚠️  Cargo not found or no Cargo.toml, cleaning manually..."
    rm -rf target/ 2>/dev/null || true
    find . -name "target" -type d -exec rm -rf {} + 2>/dev/null || true
    echo "✅ Manual Rust cleanup completed"
fi