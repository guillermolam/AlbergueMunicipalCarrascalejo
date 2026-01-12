#!/bin/bash

# Deploy to Fermyon Cloud with environment variables from .env
# https://albergue-carrascalejo.fermyon.app/

set -e

echo "🚀 Deploying to Fermyon Cloud..."
echo "Target: https://albergue-carrascalejo.fermyon.app/"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Load environment variables from .env
echo "📦 Loading environment variables from .env..."
set -a
source .env
set +a

# Check if logged in to Fermyon Cloud
if ! spin cloud login --status &>/dev/null; then
    echo "❌ Not logged in to Fermyon Cloud"
    echo "Please run: spin cloud login --auth-method token"
    echo "Or set SPIN_AUTH_TOKEN environment variable"
    exit 1
fi

echo "✅ Authenticated to Fermyon Cloud"
echo ""

# Build the Spin app
echo "📦 Building Spin app..."
spin build || {
    echo "❌ Build failed"
    exit 1
}

echo "✅ Build completed"
echo ""

# Prepare deployment variables from .env
# Extract SPIN_VARIABLE_* entries and convert them to --variable flags
DEPLOY_VARS=""

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # Only process SPIN_VARIABLE_* entries
    if [[ "$key" =~ ^SPIN_VARIABLE_ ]]; then
        # Remove SPIN_VARIABLE_ prefix and convert to lowercase
        var_name="${key#SPIN_VARIABLE_}"
        var_name=$(echo "$var_name" | tr '[:upper:]' '[:lower:]')

        # Remove quotes from value
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        # Add to deployment variables
        DEPLOY_VARS="$DEPLOY_VARS --variable ${var_name}=${value}"
        echo "  ✓ Setting variable: ${var_name}"
    fi
done < .env

echo ""
echo "🌐 Deploying to Fermyon Cloud..."

# Deploy to Fermyon Cloud with variables
spin cloud deploy --from spin.toml $DEPLOY_VARS || {
    echo "❌ Deployment failed"
    exit 1
}

echo ""
echo "✅ Deployment completed!"
echo "🌍 Your application is available at: https://albergue-carrascalejo.fermyon.app/"
echo ""
echo "Useful commands:"
echo "  spin cloud logs albergue-carrascalejo    # View logs"
echo "  spin cloud variables list                # List variables"
echo "  spin cloud apps list                     # List deployed apps"
