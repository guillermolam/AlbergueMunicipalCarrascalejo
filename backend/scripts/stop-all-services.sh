#!/bin/bash

# Backend Services Stop Script
# This script stops all running backend services

set -e

echo "🔄 Stopping all backend services..."

# Kill processes related to backend services
services=(
	"spin up"
	"spin build"
	"cargo watch"
	"cargo run"
)

for service_pattern in "${services[@]}"; do
	pkill -f "$service_pattern" || true
done

echo "✅ All backend services stopped"
