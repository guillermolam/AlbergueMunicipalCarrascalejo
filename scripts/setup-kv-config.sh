#!/bin/bash

# Setup script for configuring Spin KV store with sensitive data
# This script should be run once to initialize the KV store with database credentials

set -e

echo " Setting up Spin KV store configuration..."

# Check if spin is installed
if ! command -v spin &> /dev/null; then
    echo " Spin CLI is not installed. Please install it first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "spin.toml" ]; then
    echo " spin.toml not found. Please run this script from the project root."
    exit 1
fi

# Prompt for database URL
echo "Please enter your database URL (or press Enter to skip):"
read -r DATABASE_URL

if [ -n "$DATABASE_URL" ]; then
    echo " Setting DATABASE_URL in KV store..."

    # Use spin kv set to store the database URL
    # Note: This requires the application to be deployed or running locally
    echo "  Note: Make sure your Spin application is deployed or running locally"
    echo "   before running this command:"
    echo ""
    echo "   spin kv set albergue-frontend config DATABASE_URL \"$DATABASE_URL\""
    echo ""
    echo "   Or for local development:"
    echo "   spin kv set --local albergue-frontend config DATABASE_URL \"$DATABASE_URL\""
    echo ""

    # Alternative: Create a .env file for local development
    echo " For local development, you can also create a .env file:"
    echo "   DATABASE_URL=\"$DATABASE_URL\"" > .env.example
    echo "   Created .env.example file"
else
    echo "  Skipping DATABASE_URL configuration"
fi

echo ""
echo " Next steps:"
echo "1. Deploy your Spin application or start it locally"
echo "2. Run the spin kv set command shown above"
echo "3. Your services will now use the KV store for configuration"
echo ""
echo " For more information, see:"
echo "   https://developer.fermion.cloud/spin/v2/kv-store"
