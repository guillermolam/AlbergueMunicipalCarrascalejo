#!/bin/bash

# Backend Services Startup Script
# Consolidated script to start all backend services

set -e

echo " Starting all backend services..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to root directory
cd "$ROOT_DIR"

# Ensure build is up to date
echo " Building services..."
./scripts/build-services.sh all debug

# Generate or validate ports
if [[ ! -f ".ports.json" ]]; then
	echo "  Port configuration not found, generating..."
	./scripts/port-management.sh generate
fi

# Source port configurations
if [[ -f ".env.ports" ]]; then
	source .env.ports
fi

# Display current port assignments
./scripts/port-management.sh show

# Start services in order of dependencies
echo " Starting services..."

# Start each service with its specific configuration
services=(
	"rate-limiter-service"
	"auth-service"
	"booking-service"
	"location-service"
	"notification-service"
	"info-on-arrival-service"
	"reviews-service"
)

# Create logs directory
mkdir -p logs

for service in "${services[@]}"; do
	if [[ -d "backend/$service" ]]; then
		echo "   Starting $service..."
		cd "backend/$service"

		# Get the port from environment variable (e.g., RATE_LIMITER_SERVICE_PORT)
		port_var="$(echo "${service//-/_}" | tr '[:lower:]' '[:upper:]')_PORT"
		port=${!port_var:-0}

		if [ "$port" -gt 0 ]; then
			spin up --listen "127.0.0.1:$port" >"../../logs/${service}.log" 2>&1 &
		else
			cargo run --release >"../../logs/${service}.log" 2>&1 &
		fi

		cd "$ROOT_DIR"
	else
		echo "    $service directory not found, skipping..."
	fi
done

echo " All backend services started"
wait
