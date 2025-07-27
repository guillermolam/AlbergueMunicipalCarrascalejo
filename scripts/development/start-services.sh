#!/usr/bin/env bash

# Start all services in development mode
set -euo pipefail

echo "🚀 Starting all services in development mode..."

# Load environment variables if .env file exists
if [ -f .env ]; then
	source .env
fi

#!/bin/bash

# Script para iniciar servicios del backend
# Usa los puertos configurados en .env.ports

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Cargar variables de entorno
if [ -f ".env.ports" ]; then
	source .env.ports
	echo -e "${BLUE}🔧 Cargando configuración de puertos...${NC}"
fi

# Función para iniciar un servicio
start_service() {
	local service=$1
	local port_var="${service^^}_PORT"
	port_var=${port_var//-/_}
	local port=${!port_var:-"8000"}

	echo -e "${GREEN}🚀 Iniciando $service en puerto $port...${NC}"

	cd "backend/$service"
	if [ -f "spin.toml" ]; then
		spin up --listen "127.0.0.1:$port" &
	else
		echo -e "${YELLOW}⚠️ No se encontró spin.toml para $service${NC}"
	fi
	cd - >/dev/null
}

# Iniciar servicios según el parámetro
SERVICES=(
	"auth-service"
	"booking-service"
	"location-service"
	"reviews-service"
	"notification-service"
	"info-on-arrival-service"
	"rate-limiter-service"
)

case "${1:-all}" in
"backend")
	for service in "${SERVICES[@]}"; do
		start_service "$service"
	done
	;;
*)
	if [ -n "$1" ] && [ -d "backend/$1" ]; then
		start_service "$1"
	else
		echo "Uso: $0 [backend|nombre-del-servicio]"
		exit 1
	fi
	;;
esac

echo -e "${GREEN}🎉 Servicios iniciados!${NC}"
echo "Usa 'task dev:status' para verificar el estado"

# Start backend services
echo "🔧 Starting backend services..."
start_service "auth-service" "cargo spin build --up" "backend/auth-service"
start_service "booking-service" "cargo spin build --up" "backend/booking-service"
start_service "location-service" "cargo spin build --up" "backend/location-service"

# Start frontend
echo "🎨 Starting frontend..."
start_service "frontend" "bun run dev" "frontend"

# Start gateway
echo "🌐 Starting gateway..."
start_service "gateway" "cargo spin build --up" "gateway"

echo "✅ All services started!"
echo "Check logs with: tail -f /tmp/*.pid"
echo "Stop all services: pkill -f 'spin|bun'"
