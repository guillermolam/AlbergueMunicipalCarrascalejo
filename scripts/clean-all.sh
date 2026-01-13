#!/bin/bash
set -e

# Centralized all-in-one cleaning script
# Usage: ./scripts/clean-all.sh [mode]
# Modes: frontend, rust, all (default)

MODE="${1:-all}"
echo " Starting comprehensive cleanup (mode: $MODE)..."

# Frontend cleanup
if [[ $MODE == "frontend" || $MODE == "all" ]]; then
	echo " Cleaning frontend projects..."

	# Main frontend
	if [[ -d "frontend" ]]; then
		./scripts/clean-frontend.sh frontend
	fi

	# Auth service frontend
	if [[ -d "backend/auth-service" ]]; then
		./scripts/clean-frontend.sh backend/auth-service
	fi
fi

# Rust cleanup
if [[ $MODE == "rust" || $MODE == "all" ]]; then
	echo " Cleaning Rust projects..."

	# Main workspace
	./scripts/clean-rust.sh .

	# Backend workspace
	./scripts/clean-rust.sh backend

	# Individual services
	for service in backend/*/; do
		if [[ -f "$service/Cargo.toml" ]]; then
			./scripts/clean-rust.sh "$service"
		fi
	done
fi

# Additional cleanup
if [[ $MODE == "all" ]]; then
	echo " Cleaning additional artifacts..."

	# Remove port configurations
	rm -rf .ports.json 2>/dev/null || true
	rm -rf .env.ports 2>/dev/null || true

	# Stop running services
	echo " Stopping running services..."
	pkill -f "spin up" || true
	pkill -f "bun run dev" || true
	pkill -f "vite" || true
	pkill -f "concurrently" || true

	echo " All cleanup completed"
fi
