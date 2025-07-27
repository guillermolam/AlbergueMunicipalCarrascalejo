#!/bin/bash

# Script para instalar dependencias del proyecto
# Detecta automáticamente qué instalar

set -euo pipefail

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📦 Instalando dependencias del proyecto...${NC}"

# Verificar herramientas necesarias
check_command() {
	if ! command -v "$1" &>/dev/null; then
		echo -e "${YELLOW}⚠️ $1 no está instalado${NC}"
		return 1
	fi
	return 0
}

# Instalar dependencias de Rust
echo -e "${BLUE}🦀 Rust dependencies...${NC}"
if check_command cargo; then
	cargo fetch
	echo -e "${GREEN}✅ Rust dependencies instaladas${NC}"
else
	echo -e "${YELLOW}Instala Rust con: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${NC}"
fi

# Instalar dependencias de Node.js/Frontend
echo -e "${BLUE}🎨 Frontend dependencies...${NC}"
if check_command bun; then
	cd frontend && bun install
	echo -e "${GREEN}✅ Frontend dependencies instaladas${NC}"
elif check_command npm; then
	cd frontend && npm install
	echo -e "${GREEN}✅ Frontend dependencies instaladas (usando npm)${NC}"
else
	echo -e "${YELLOW}Instala Bun o npm${NC}"
fi

echo -e "${GREEN}🎉 Todas las dependencias instaladas!${NC}"
