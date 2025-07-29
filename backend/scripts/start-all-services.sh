#!/bin/bash

# Backend Services Startup Script
# This script starts all backend services with proper port configuration

set -e

echo "🚀 Starting all backend services..."

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Change to backend directory
cd "$BACKEND_DIR"

# Start services in order of dependencies
echo "📦 Starting services..."

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

for service in "${services[@]}"; do
	if [[ -d $service ]]; then
		echo "  🔧 Starting $service..."
		cd "$service"
		spin up --listen "127.0.0.1:${!service^^_PORT}" &
		cd ..
	else
		echo "  ⚠️  $service directory not found, skipping..."
	fi
done

echo "✅ All backend services started"
wait
