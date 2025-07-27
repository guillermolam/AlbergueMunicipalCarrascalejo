#!/bin/bash

# Script para detener todos los servicios

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}⏹️ Deteniendo todos los servicios...${NC}"

# Matar procesos de Spin
if pgrep -f "spin up" >/dev/null; then
	echo -e "${GREEN}✅ Deteniendo servicios Spin...${NC}"
	pkill -f "spin up"
fi

# Matar procesos de frontend
if pgrep -f "bun run dev" >/dev/null; then
	echo -e "${GREEN}✅ Deteniendo frontend...${NC}"
	pkill -f "bun run dev"
fi

# Matar procesos en puertos comunes
for port in 3000 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009; do
	if lsof -i :$port >/dev/null 2>&1; then
		echo -e "${GREEN}✅ Liberando puerto $port...${NC}"
		lsof -ti :$port | xargs kill -9 2>/dev/null || true
	fi
done

echo -e "${GREEN}👌 Todos los servicios detenidos${NC}"
