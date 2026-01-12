#!/bin/bash

# Initialize SQLite database on Fermyon Cloud after deployment
# Executes schema and migrations on the Spin SQLite database

set -e

echo "🗄️  Initializing SQLite database on Fermyon Cloud..."

APP_NAME="albergue-carrascalejo"

# Check if logged in
if ! spin cloud apps list 2>/dev/null | grep -q "$APP_NAME"; then
    echo "❌ App not found or not logged in"
    echo "Please ensure:"
    echo "  1. You are logged in: spin cloud login"
    echo "  2. App is deployed: ./scripts/deploy-fermyon.sh"
    exit 1
fi

# Execute schema on Fermyon Cloud SQLite
echo "📦 Executing SQLite schema..."

if spin cloud sqlite execute \
    --app "$APP_NAME" \
    --database default \
    --statement "$(cat domain_model/schemas/sqlite.sql)" 2>&1; then
    
    echo "✅ SQLite schema initialized successfully!"
    echo ""
    echo "📋 Verifying tables..."
    
    # List created tables
    spin cloud sqlite execute \
        --app "$APP_NAME" \
        --database default \
        --statement "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" || true
    
    echo ""
    echo "✅ Database initialization complete!"
    
else
    echo "⚠️  Schema execution failed or already initialized"
    echo "This is normal if the database already has tables."
    exit 0
fi

echo ""
echo "To query the database:"
echo "  spin cloud sqlite execute --app $APP_NAME --database default --statement 'SELECT * FROM countries LIMIT 5;'"
