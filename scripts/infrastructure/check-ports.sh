#!/usr/bin/env bash

# Check if required ports are available
set -euo pipefail

# Default ports
FRONTEND_PORT=${FRONTEND_PORT:-5173}
BACKEND_PORT=${BACKEND_PORT:-8000}
GATEWAY_PORT=${GATEWAY_PORT:-3000}

# Script para verificar qué puertos están actualmente en uso
# y mostrar información sobre los procesos que los utilizan

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verificando puertos en uso...${NC}"
echo

# Función para obtener información del proceso
get_process_info() {
	local port=$1
	local pid=$(lsof -t -i :$port 2>/dev/null || echo "")

	if [[ -n $pid ]]; then
		local process=$(ps -p $pid -o comm= 2>/dev/null || echo "Unknown")
		local user=$(ps -p $pid -o user= 2>/dev/null || echo "Unknown")
		echo "PID: $pid, Process: $process, User: $user"
	else
		echo "No process found"
	fi
}

# Verificar puertos comunes del proyecto
COMMON_PORTS=(
	3000 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009
	8100 8200 8300 8400 8500 8600 8700 5432 6379
)

echo -e "${YELLOW}Puertos comunes del proyecto:${NC}"
echo "----------------------------------------"

for port in "${COMMON_PORTS[@]}"; do
	if nc -z localhost $port 2>/dev/null; then
		process_info=$(get_process_info $port)
		echo -e "${RED}❌ Port $port: IN USE${NC} ($process_info)"
	else
		echo -e "${GREEN}✅ Port $port: AVAILABLE${NC}"
	fi
done

echo
echo -e "${YELLOW}Resumen de todos los puertos en uso:${NC}"
echo "----------------------------------------"

# Mostrar todos los puertos TCP en uso
if command -v lsof &>/dev/null; then
	echo "Puertos TCP en uso:"
	lsof -iTCP -sTCP:LISTEN -P -n | grep -E "(LISTEN|ESTABLISHED)" | awk '{print $9}' | sed 's/.*://' | sort -n | uniq
else
	echo "lsof no está disponible. Usando netstat..."
	if command -v netstat &>/dev/null; then
		netstat -tlnp 2>/dev/null | grep LISTEN | awk '{print $4}' | sed 's/.*://' | sort -n | uniq
	else
		echo "Ni lsof ni netstat están disponibles. Instala uno de ellos para ver puertos."
	fi
fi

echo
echo -e "${BLUE}💡 Tip:${NC} Usa 'kill -9 <PID>' para liberar un puerto específico"

echo "Checking port availability..."

# Check all required ports
failed=0
check_port $FRONTEND_PORT "frontend" || failed=1
check_port $BACKEND_PORT "backend" || failed=1
check_port $GATEWAY_PORT "gateway" || failed=1

if [ $failed -eq 1 ]; then
	echo "❌ Some ports are already in use. Use 'task openports' to find free ports."
	exit 1
fi

echo "✅ All ports are available"
