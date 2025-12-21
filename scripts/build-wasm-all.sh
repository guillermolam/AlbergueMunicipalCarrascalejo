#!/bin/bash

# Build all Rust services to WASM targets
# This script ensures all services are properly compiled for Spin

set -e

echo "🔨 Building all Rust services to WASM..."

# Ensure wasm32-wasip1 target is installed
rustup target add wasm32-wasip1

# Stop any running instances
echo "🛑 Stopping any running services..."
pkill -f "spin up" || true
pkill -f "cargo run" || true

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd backend/shared
cargo clean
cd ../..

# Skip building shared library first as it might have dependencies that don't work in WASM
# We'll let each service pull in the shared library as needed
echo "ℹ️  Skipping shared library build, will be built as part of each service"

# Build all services
echo "🏗️  Building all services..."

# Generate or validate ports
echo "🔧 Setting up port assignments..."
./scripts/port-management.sh generate

# Display port assignments
./scripts/port-management.sh show
cd backend

services=(
	"booking-service"
	"notification-service"
	"reviews-service"
	"security-service"
	"document-document-validation-service"
	"info-on-arrival-service"
	"location-service"
	"rate-limiter-service"
	"auth-service"
	"payment-service"
	"user-management-service"
	"booking-service"
	"country_cache_service"
	"redis_service"
)

for service in "${services[@]}"; do
	echo "🔨 Building $service..."
	cd "$service"
	cargo build --target wasm32-wasip1 --release
	echo "✅ $service built successfully"
	cd ..
done

echo "🎉 All services built successfully!"
echo "📁 WASM files are located in: backend/*/target/wasm32-wasip1/release/"
