#!/bin/bash

# Script para verificar el estado de los servicios

set -euo pipefail

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Cargar variables de entorno
if [ -f ".env.ports" ]; then
	source .env.ports
fi

echo -e "${BLUE}🏥 Verificando estado de servicios...${NC}"
echo "=========================================="

# Función para verificar un servicio
check_service() {
	local name=$1
	local port_var="${2:-${name^^}_PORT}"
	port_var=${port_var//-/_}
	local port=${!port_var:-"8000"}
	local endpoint=${3:-"/health"}

	echo -n "🔍 $name (puerto $port): "

	if nc -z localhost $port 2>/dev/null; then
		if curl -s "http://localhost:$port$endpoint" >/dev/null 2>&1; then
			echo -e "${GREEN}✅ HEALTHY${NC}"
		else
			echo -e "${YELLOW}⚠️ RUNNING (health check failed)${NC}"
		fi
	else
		echo -e "${RED}❌ DOWN${NC}"
	fi
}

# Verificar servicios principales
check_service "Frontend" "FRONTEND_PORT" "/"
check_service "Gateway" "GATEWAY_PORT" "/health"
check_service "Auth Service" "AUTH_SERVICE_PORT" "/health"
check_service "Booking Service" "BOOKING_SERVICE_PORT" "/health"
check_service "Location Service" "LOCATION_SERVICE_PORT" "/health"
check_service "Reviews Service" "REVIEWS_SERVICE_PORT" "/health"
check_service "Notification Service" "NOTIFICATION_SERVICE_PORT" "/health"
check_service "Info on Arrival" "INFO_ON_ARRIVAL_SERVICE_PORT" "/health"
check_service "Rate Limiter" "RATE_LIMITER_SERVICE_PORT" "/health"

echo "=========================================="
echo -e "${BLUE}📊 Verificación completada${NC}"
