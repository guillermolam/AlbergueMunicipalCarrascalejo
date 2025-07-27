#!/bin/bash

# Script para construir todos los servicios del backend

set -euo pipefail

echo "🦀 Construyendo servicios del backend..."

SERVICES=(
	"auth-service"
	"booking-service"
	"location-service"
	"reviews-service"
	"notification-service"
	"info-on-arrival-service"
	"rate-limiter-service"
)

for service in "${SERVICES[@]}"; do
	echo "  🔨 Construyendo $service..."
	cd "backend/$service"
	cargo build --release
	cd - >/dev/null
done

echo "✅ Todos los servicios del backend construidos"
