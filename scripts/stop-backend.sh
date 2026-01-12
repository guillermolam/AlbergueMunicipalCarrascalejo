#!/bin/bash

# Backend Services Stop Script
# Consolidated script to stop all backend services

set -e

echo " Stopping all backend services..."

# Kill processes related to backend services
services=(
	"spin up"
	"spin build"
	"cargo watch"
	"cargo run"
	"npm run dev"
	"bun run dev"
)

for service_pattern in "${services[@]}"; do
	pkill -f "$service_pattern" || true
done

echo " All backend services stopped"
