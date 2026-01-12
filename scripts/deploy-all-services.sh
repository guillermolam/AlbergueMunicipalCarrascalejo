#!/bin/bash

# Deploy all Spin services to Fermyon Cloud
# This script builds and deploys each service individually

set -e

echo " Starting deployment of all services to Fermyon Cloud..."

# Services to deploy
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
)

# Ensure we're logged into Fermyon Cloud
echo " Checking Fermyon Cloud login..."
spin login

# Build all services first
echo " Building all services..."
cd backend
cargo build --target wasm32-wasi --release --workspace --exclude shared

# Deploy each service
for service in "${services[@]}"; do
	echo " Deploying $service..."
	cd "$service"

	# Deploy the service
	spin deploy --registry ghcr.io

	echo " $service deployed successfully"
	cd ..
done

echo " All services deployed successfully to Fermyon Cloud!"
echo " You can view your deployments at: https://cloud.fermyon.com"
