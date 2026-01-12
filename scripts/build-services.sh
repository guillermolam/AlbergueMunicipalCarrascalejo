#!/bin/bash
set -e

# Centralized build script for all services
# Usage: ./scripts/build-services.sh [service] [mode]

SERVICE="${1:-all}"
MODE="${2:-release}"
TARGET="wasm32-wasip1"

echo " Building services: $SERVICE (mode: $MODE)"

# Stop any running instances
echo " Stopping any running services..."
pkill -f "spin up" || true
pkill -f "cargo run" || true

# Generate or validate ports
echo " Setting up port assignments..."
./scripts/port-management.sh generate
./scripts/port-management.sh show

build_rust_service() {
	local service_dir="$1"
	local service_name="$2"

	if [[ -f "$service_dir/Cargo.toml" ]]; then
		echo " Building $service_name..."
		cd "$service_dir"

		# Determine build flags based on mode
		local build_flags=""
		if [[ $MODE == "release" ]]; then
			build_flags="--release"
		fi

		if [[ -f "spin.toml" ]]; then
			# Spin service
			cargo build --target "$TARGET" $build_flags
			spin build
		else
			# Regular Rust service
			cargo build $build_flags
		fi

		echo " $service_name built successfully"
		cd - >/dev/null
	else
		echo "  $service_name directory not found or no Cargo.toml"
	fi
}

build_frontend() {
	local frontend_dir="$1"
	local service_name="$2"

	if [[ -f "$frontend_dir/package.json" ]]; then
		echo " Building $service_name frontend..."
		cd "$frontend_dir"

		if command -v bun &>/dev/null; then
			bun run build
		else
			npm run build
		fi

		echo " $service_name frontend built successfully"
		cd - >/dev/null
	else
		echo "  $service_name frontend not found"
	fi
}

case $SERVICE in
"gateway")
	build_rust_service "gateway" "Gateway"
	;;
"backend")
	echo " Building all backend services..."
	cargo build --workspace --target "$TARGET" --$MODE --exclude shared
	echo " All backend services built successfully"
	;;
"frontend")
	build_frontend "frontend" "Main Frontend"
	if [[ -d "backend/auth-service/app" ]]; then
		build_frontend "backend/auth-service/app" "Auth Frontend"
	fi
	;;
"all")
	echo " Building all services..."
	build_rust_service "gateway" "Gateway"
	echo " Building backend services..."
	cargo build --workspace --target "$TARGET" --$MODE --exclude shared
	build_frontend "frontend" "Main Frontend"
	if [[ -d "backend/auth-service/app" ]]; then
		build_frontend "backend/auth-service/app" "Auth Frontend"
	fi
	echo " All services built successfully"
	;;
*)
	echo " Unknown service: $SERVICE"
	echo "Available services: gateway, backend, frontend, all"
	exit 1
	;;
esac
