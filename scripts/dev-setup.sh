#!/bin/bash
set -e

# Development environment setup script
# Usage: ./scripts/dev-setup.sh

echo "Setting up development environment..."

# Check dependencies
echo "Checking dependencies..."
command -v node >/dev/null 2>&1 || {
	echo "ERROR: Node.js is required but not installed."
	exit 1
}
command -v cargo >/dev/null 2>&1 || {
	echo "ERROR: Rust/Cargo is required but not installed."
	exit 1
}
command -v bun >/dev/null 2>&1 || echo "WARNING: Bun not found, falling back to npm"

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if command -v bun >/dev/null 2>&1; then
	bun install
else
	npm install
fi
cd ..

# Install auth service frontend dependencies
if [[ -d "backend/auth-service" ]]; then
	echo "Installing auth service frontend dependencies..."
	cd backend/auth-service
	if command -v bun >/dev/null 2>&1; then
		bun install
	else
		npm install
	fi
	cd ../..
fi

# Setup database
echo "Setting up database..."
if [[ -f "database/scripts/setup-db.sh" ]]; then
	./database/scripts/setup-db.sh
else
	echo "WARNING: Database setup script not found, skipping..."
fi

echo "Development environment setup complete!"
echo ""
echo "Next steps:"
echo "  - Run './scripts/dev-start.sh' to start development servers"
echo "  - Run 'task dev' to start all services"
