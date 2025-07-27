#!/bin/bash

# Script para ejecutar pruebas unitarias

set -euo pipefail

echo "🧪 Ejecutando pruebas unitarias..."

# Pruebas del backend
echo "  🦀 Backend tests..."
cd backend && cargo test

# Pruebas del frontend
echo "  🎨 Frontend tests..."
cd frontend && bun test

echo "✅ Todas las pruebas unitarias pasaron"
