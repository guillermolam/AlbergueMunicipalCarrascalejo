#!/bin/bash
set -e

# Centralized port management script
# Usage: ./scripts/port-management.sh [action]

ACTION="${1:-show}"
PORT_FILE=".ports.json"
ENV_FILE=".env.ports"

echo " Port management: $ACTION"

generate_ports() {
	echo " Generating unique port assignments..."

	# Use Python script if available
	if [[ -f "scripts/port-manager.py" ]]; then
		python3 scripts/port-manager.py generate
	else
		# Fallback manual generation
		echo "{
  "FRONTEND_PORT": $((3000 + RANDOM % 1000)),
  "GATEWAY_PORT": $((4000 + RANDOM % 1000)),
  "AUTH_FRONTEND_PORT": $((5000 + RANDOM % 1000)),
  "BOOKING_PORT": $((6000 + RANDOM % 1000)),
  "NOTIFICATION_PORT": $((7000 + RANDOM % 1000)),
  "INFO_ARRIVAL_PORT": $((8000 + RANDOM % 1000)),
  "LOCATION_PORT": $((9000 + RANDOM % 1000)),
  "RATE_LIMITER_PORT": $((10000 + RANDOM % 1000)),
  "REVIEWS_PORT": $((11000 + RANDOM % 1000)),
  "SECURITY_PORT": $((12000 + RANDOM % 1000))
}" >"$PORT_FILE"

		# Generate .env.ports file
		cat "$PORT_FILE" | jq -r 'to_entries | .[] | "export \(.key)=\(.value)"' >"$ENV_FILE"
	fi

	echo " Port assignments generated"
	show_ports
}

show_ports() {
	echo " Current port assignments:"

	if [[ -f $PORT_FILE ]]; then
		cat "$PORT_FILE" | jq -r '. | to_entries | .[] | "  \(.key): \(.value)"'
	else
		echo "  No port configuration found. Run 'generate' first."
	fi
}

clean_ports() {
	echo " Cleaning port configurations..."
	rm -f "$PORT_FILE" "$ENV_FILE"
	echo " Port configurations cleaned"
}

validate_ports() {
	echo " Validating port assignments..."

	if [[ ! -f $PORT_FILE ]]; then
		echo " No port configuration found"
		exit 1
	fi

	# Check for port conflicts
	local ports=$(cat "$PORT_FILE" | jq -r '.[]')
	local unique_ports=$(echo "$ports" | sort -u | wc -l)
	local total_ports=$(echo "$ports" | wc -l)

	if [[ $unique_ports -ne $total_ports ]]; then
		echo " Port conflicts detected!"
		echo "Unique ports: $unique_ports, Total ports: $total_ports"
		exit 1
	fi

	# Check if ports are in use
	for port in $ports; do
		if netstat -tuln 2>/dev/null | grep -q ":$port "; then
			echo "  Port $port is currently in use"
		fi
	done

	echo " All ports validated successfully"
}

case $ACTION in
"generate" | "gen")
	generate_ports
	;;
"show" | "list")
	show_ports
	;;
"clean" | "clear")
	clean_ports
	;;
"validate" | "check")
	validate_ports
	;;
*)
	echo " Unknown action: $ACTION"
	echo "Available actions: generate|gen, show|list, clean|clear, validate|check"
	exit 1
	;;
esac
