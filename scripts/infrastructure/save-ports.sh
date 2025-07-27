#!/bin/bash

# Script para guardar la configuración de puertos en archivos de configuración
# Actualiza automáticamente los archivos spin.toml y otros configs

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CONFIG_FILE="ports.json"
ENV_FILE=".env.ports"

# Verificar que existan los archivos necesarios
if [[ ! -f $CONFIG_FILE ]]; then
	echo -e "${RED}❌ Error: $CONFIG_FILE no encontrado${NC}"
	echo "Ejecuta primero: python3 scripts/infrastructure/assign-ports.py"
	exit 1
fi

echo -e "${BLUE}📝 Guardando configuración de puertos...${NC}"

# Función para actualizar archivo spin.toml
update_spin_toml() {
	local service=$1
	local port=$2
	local toml_file="backend/${service}/spin.toml"

	if [[ -f $toml_file ]]; then
		# Backup del archivo original
		cp "$toml_file" "${toml_file}.backup"

		# Actualizar el puerto en spin.toml
		sed -i.bak "s/port = [0-9]\+/port = ${port}/g" "$toml_file" 2>/dev/null || true

		echo -e "${GREEN}✅${NC} Actualizado $toml_file -> puerto $port"
	else
		echo -e "${YELLOW}⚠️${NC} $toml_file no encontrado"
	fi
}

# Función para actualizar configuraciones de frontend
update_frontend_config() {
	if [[ -f $ENV_FILE ]]; then
		# Copiar .env.ports al frontend
		cp "$ENV_FILE" "frontend/.env.local" 2>/dev/null || true
		echo -e "${GREEN}✅${NC} Actualizado frontend/.env.local"
	fi
}

# Función para actualizar gateway Caddyfile
update_gateway_config() {
	local caddyfile="gateway/Caddyfile"

	if [[ -f $caddyfile ]]; then
		cp "$caddyfile" "${caddyfile}.backup"

		# Leer puertos desde .env.ports y actualizar Caddyfile
		if [[ -f $ENV_FILE ]]; then
			while IFS='=' read -r key value; do
				if [[ $key == *_PORT ]]; then
					service=$(echo $key | sed 's/_PORT$//' | tr '[:upper:]' '[:lower:]' | tr '_' '-')
					# Actualizar solo si el servicio existe en el Caddyfile
					if grep -q "$service" "$caddyfile"; then
						sed -i.bak "s|localhost:[0-9]\+|localhost:${value}|g" "$caddyfile" 2>/dev/null || true
						echo -e "${GREEN}✅${NC} Actualizado $service -> puerto $value en Caddyfile"
					fi
				fi
			done <"$ENV_FILE"
		fi
	fi
}

# Leer configuración de puertos desde JSON
SERVICES=$(python3 -c "
import json
with open('$CONFIG_FILE') as f:
    ports = json.load(f)
    for service, port in ports.items():
        print(f'{service}:{port}')
")

# Actualizar cada servicio
echo
echo -e "${YELLOW}Actualizando configuraciones:${NC}"
echo "----------------------------------------"

while IFS=':' read -r service port; do
	if [[ -n $service && -n $port ]]; then
		case "$service" in
		"frontend")
			update_frontend_config
			;;
		"gateway")
			update_gateway_config
			;;
		*"service")
			update_spin_toml "$service" "$port"
			;;
		*)
			echo -e "${YELLOW}⚠️${NC} Servicio desconocido: $service"
			;;
		esac
	fi
done <<<"$SERVICES"

echo
echo -e "${GREEN}🎉 Configuración de puertos guardada exitosamente!${NC}"
echo
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo "1. Revisa los archivos .backup creados"
echo "2. Reinicia los servicios para aplicar cambios"
echo "3. Ejecuta: task dev:start para iniciar todo"
