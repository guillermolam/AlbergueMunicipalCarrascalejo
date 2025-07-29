#!/bin/bash
set -e

# Centralized frontend cleaning script
# Usage: ./scripts/clean-frontend.sh [directory]

TARGET_DIR="${1:-frontend}"
echo "🧹 Cleaning frontend in $TARGET_DIR..."

if [[ -f "$TARGET_DIR/package.json" ]]; then
    cd "$TARGET_DIR"
    
    # Try to use package.json clean script first
    if npm run clean --silent 2>/dev/null || bun run clean --silent 2>/dev/null; then
        echo "✅ Cleaned via package.json script"
    else
        echo "⚠️  No clean script found, cleaning manually..."
        rm -rf dist/ 2>/dev/null || true
        rm -rf node_modules/.cache 2>/dev/null || true
        rm -rf build/ 2>/dev/null || true
        echo "✅ Manual cleanup completed"
    fi
else
    echo "❌ No package.json found in $TARGET_DIR"
    exit 1
fi