#!/bin/bash
set -e

# Centralized health check script
# Usage: ./scripts/health-check.sh [service]

SERVICE="${1:-all}"
TIMEOUT=5

echo " Running health checks: $SERVICE"

check_service_health() {
	local service_name="$1"
	local url="$2"
	local expected_status="${3:-200}"

	echo "Checking $service_name at $url..."

	if curl -s -f --max-time $TIMEOUT "$url" >/dev/null 2>&1; then
		echo " $service_name is healthy"
		return 0
	else
		echo " $service_name is not responding"
		return 1
	fi
}

check_port_health() {
	local service_name="$1"
	local port="$2"

	if [[ -z $port ]]; then
		echo "  No port configured for $service_name"
		return 1
	fi

	if nc -z localhost "$port" 2>/dev/null; then
		echo " $service_name port $port is open"
		return 0
	else
		echo " $service_name port $port is not accessible"
		return 1
	fi
}

# Source port configurations if available
if [[ -f ".env.ports" ]]; then
	source .env.ports
fi

# Default ports if not configured
FRONTEND_PORT=${FRONTEND_PORT:-5173}
GATEWAY_PORT=${GATEWAY_PORT:-3000}
AUTH_FRONTEND_PORT=${AUTH_FRONTEND_PORT:-5174}
BOOKING_PORT=${BOOKING_PORT:-8080}
NOTIFICATION_PORT=${NOTIFICATION_PORT:-8081}
INFO_ARRIVAL_PORT=${INFO_ARRIVAL_PORT:-8082}
LOCATION_PORT=${LOCATION_PORT:-8083}
RATE_LIMITER_PORT=${RATE_LIMITER_PORT:-8084}
REVIEWS_PORT=${REVIEWS_PORT:-8085}
SECURITY_PORT=${SECURITY_PORT:-8086}

case $SERVICE in
"frontend")
	check_service_health "Frontend" "http://localhost:$FRONTEND_PORT"
	;;
"gateway")
	check_service_health "Gateway" "http://localhost:$GATEWAY_PORT/health"
	;;
"auth")
	check_service_health "Auth Frontend" "http://localhost:$AUTH_FRONTEND_PORT"
	;;
"booking")
	check_port_health "Booking Service" "$BOOKING_PORT"
	;;
"notification")
	check_port_health "Notification Service" "$NOTIFICATION_PORT"
	;;
"info-arrival")
	check_port_health "Info Arrival Service" "$INFO_ARRIVAL_PORT"
	;;
"location")
	check_port_health "Location Service" "$LOCATION_PORT"
	;;
"rate-limiter")
	check_port_health "Rate Limiter Service" "$RATE_LIMITER_PORT"
	;;
"reviews")
	check_port_health "Reviews Service" "$REVIEWS_PORT"
	;;
"security")
	check_port_health "Security Service" "$SECURITY_PORT"
	;;
"all")
	echo " Running comprehensive health checks..."

	failed_checks=0

	check_service_health "Frontend" "http://localhost:$FRONTEND_PORT" || ((failed_checks++))
	check_service_health "Gateway" "http://localhost:$GATEWAY_PORT/health" || ((failed_checks++))
	check_service_health "Auth Frontend" "http://localhost:$AUTH_FRONTEND_PORT" || ((failed_checks++))

	check_port_health "Booking Service" "$BOOKING_PORT" || ((failed_checks++))
	check_port_health "Notification Service" "$NOTIFICATION_PORT" || ((failed_checks++))
	check_port_health "Info Arrival Service" "$INFO_ARRIVAL_PORT" || ((failed_checks++))
	check_port_health "Location Service" "$LOCATION_PORT" || ((failed_checks++))
	check_port_health "Rate Limiter Service" "$RATE_LIMITER_PORT" || ((failed_checks++))
	check_port_health "Reviews Service" "$REVIEWS_PORT" || ((failed_checks++))
	check_port_health "Security Service" "$SECURITY_PORT" || ((failed_checks++))

	if [[ $failed_checks -eq 0 ]]; then
		echo " All services are healthy!"
		exit 0
	else
		echo " $failed_checks service(s) failed health checks"
		exit 1
	fi
	;;
*)
	echo " Unknown service: $SERVICE"
	echo "Available services: frontend, gateway, auth, booking, notification, info-arrival, location, rate-limiter, reviews, security, all"
	exit 1
	;;
esac
