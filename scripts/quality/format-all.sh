#!/bin/bash

# Script para formatear todo el código

set -euo pipefail

echo "🎨 Formateando código..."

# Formatear Rust
echo "  🦀 Formateando Rust..."
cd backend && cargo fmt --all
cd gateway && cargo fmt --all

# Formatear TypeScript/JavaScript
if [ -f "frontend/package.json" ]; then
	echo "  🎨 Formateando TypeScript..."
	cd frontend && bun run format 2>/dev/null || echo "No format script found"
fi

echo "✅ Código formateado"
