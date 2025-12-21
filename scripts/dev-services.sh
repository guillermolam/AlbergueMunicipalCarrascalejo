#!/bin/bash
set -e

# Centralized development services script
# Usage: ./scripts/dev-services.sh [action] [service]

ACTION="${1:-start}"
SERVICE="${2:-all}"

echo "🚀 Managing development services: $ACTION $SERVICE"

# Source port configurations
if [ -f ".env.ports" ]; then
	source .env.ports
fi

stop_all_services() {
	echo "🛑 Stopping all development services..."
	pkill -f "spin up" || true
	pkill -f "cargo run" || true
	pkill -f "npm run dev" || true
	pkill -f "bun run dev" || true
	echo "✅ All services stopped"
}

start_all_services() {
	echo "🔧 Starting all development services..."

	# Stop any running instances first
	stop_all_services

	# Ensure build is up to date
	echo "🔨 Building services..."
	./scripts/build-services.sh all debug

	# Generate or validate ports
	if [[ ! -f ".ports.json" ]]; then
		echo "⚠️  Port configuration not found, generating..."
		./scripts/port-management.sh generate
	fi

	# Source port configurations
	if [[ -f ".env.ports" ]]; then
		source .env.ports
	fi

	# Display current port assignments
	./scripts/port-management.sh show

	# Start services with proper environment
	echo "💡 Starting services with configured ports..."

	# Use backend script if available
	if [[ -f "backend/scripts/start-all-services.sh" ]]; then
		./backend/scripts/start-all-services.sh &
	fi

	# Start frontend services
	if command -v concurrently &>/dev/null; then
		concurrently --names "FRONT,GATE,AUTH" --prefix-colors "bgBlue.bold,bgMagenta.bold,bgYellow.bold" \
			"cd frontend && ${FRONTEND_PORT:+PORT=$FRONTEND_PORT} pnpm run dev" \
			"cd gateway && ${GATEWAY_PORT:+PORT=$GATEWAY_PORT} spin up" \
			"cd backend/auth-service/app && ${AUTH_FRONTEND_PORT:+PORT=$AUTH_FRONTEND_PORT} pnpm run dev" ||
			echo "Concurrently not available, starting services manually..."
	else
		echo "⚠️  'concurrently' not found. Install with: npm install -g concurrently"
		echo "Starting services individually..."
	fi
}

stop_all_services() {
	echo "🛑 Stopping all development services..."

	# Kill processes by name
	pkill -f "spin up" || true
	pkill -f "pnpm run dev" || true
	pkill -f "vite" || true
	pkill -f "concurrently" || true

	# Stop backend services
	if [[ -f "backend/scripts/stop-all-services.sh" ]]; then
		./backend/scripts/stop-all-services.sh || true
	fi

	echo "✅ All development services stopped"
}

restart_all_services() {
	echo "🔄 Restarting all development services..."
	stop_all_services
	sleep 2
	start_all_services
}

case $ACTION in
"start" | "up")
	start_all_services
	;;
"stop" | "down")
	stop_all_services
	;;
"restart" | "reload")
	restart_all_services
	;;
"status")
	echo "📊 Development services status:"
	pgrep -fl "spin|vite|pnpm" || echo "No development services running"
	;;
*)
	echo "❌ Unknown action: $ACTION"
	echo "Available actions: start|up, stop|down, restart|reload, status"
	exit 1
	;;
esac
