#!/bin/bash

# Run all tests for Spin services
# This includes unit tests, integration tests, and Spin-specific tests

set -e

echo " Running tests for all services..."

cd backend

# Services to test
services=(
	"shared"
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

for service in "${services[@]}"; do
	echo " Testing $service..."
	cd "$service"

	# Run all tests including Spin tests
	cargo test

	echo " $service tests passed"
	cd ..
done

echo " All service tests passed!"
