#!/bin/bash

# Build all Rust services to WASM targets
# This script ensures all services are properly compiled for Spin

set -e

echo "🔨 Building all Rust services to WASM..."

# Ensure wasm32-wasi target is installed
rustup target add wasm32-wasi

# Build shared library first
echo "📦 Building shared library..."
cd backend/shared
cargo build --target wasm32-wasi --release
cd ../..

# Build all services
echo "🏗️ Building all services..."
cd backend

services=(
	"booking-service"
	"notification-service"
	"reviews-service"
	"security-service"
	"validation-service"
	"info-on-arrival-service"
	"location-service"
	"rate-limiter-service"
	"auth-service"
)

for service in "${services[@]}"; do
	echo "🔨 Building $service..."
	cd "$service"
	cargo build --target wasm32-wasi --release
	echo "✅ $service built successfully"
	cd ..
done

echo "🎉 All services built successfully!"
echo "📁 WASM files are located in: backend/*/target/wasm32-wasi/release/"
