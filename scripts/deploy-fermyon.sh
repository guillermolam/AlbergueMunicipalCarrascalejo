#!/bin/bash

# Deploy to Fermyon Cloud
# https://alberguecarrascalejo.fermyon.app/

set -e

echo "🚀 Deploying to Fermyon Cloud..."
echo "Target: https://alberguecarrascalejo.fermyon.app/"
echo ""

# Check if logged in to Fermyon Cloud
if ! ./spin cloud login --status 2>/dev/null; then
	echo "❌ Not logged in to Fermyon Cloud"
	echo "Please run: ./spin cloud login"
	exit 1
fi

# Build all services
echo "📦 Building all services..."
export PATH="$HOME/.bun/bin:$PATH"
task build || {
	echo "❌ Build failed"
	exit 1
}

echo "✅ Build completed"
echo ""

# Deploy to Fermyon Cloud
echo "🌐 Deploying to Fermyon Cloud..."
./spin deploy --from spin.toml

echo ""
echo "✅ Deployment completed!"
echo "🌍 Your application is available at: https://alberguecarrascalejo.fermyon.app/"
echo ""
echo "To check logs: ./spin cloud logs albergue-microservices"
echo "To check variables: ./spin cloud variables list"
