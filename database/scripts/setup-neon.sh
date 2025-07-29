#!/bin/bash
set -e

echo "🔧 NeonDB Setup for Albergue del Carrascalejo"

# Configuration
PROD_URL="postgresql://neondb_owner:npg_X1gcn3aYhPAB@ep-frosty-paper-a2rbivma-pooler.eu-central-1.aws.neon.tech/albergue-carrascalejo?sslmode=require&channel_binding=require"
DEV_URL="postgresql://neondb_owner:npg_X1gcn3aYhPAB@ep-odd-boat-a2k9sscv-pooler.eu-central-1.aws.neon.tech/albergue-carrascalejo?sslmode=require&channel_binding=require"

# Function to test connection
test_connection() {
    local url=$1
    local env_name=$2
    
    echo "Testing $env_name connection..."
    if psql "$url" -c "SELECT version();" &>/dev/null; then
        echo "✅ $env_name connection successful"
        return 0
    else
        echo "❌ $env_name connection failed"
        return 1
    fi
}

# Function to setup database
setup_database() {
    local url=$1
    local env_name=$2
    
    echo "Setting up $env_name database..."
    
    # Test connection first
    if ! test_connection "$url" "$env_name"; then
        return 1
    fi
    
    # Apply migrations
    echo "📋 Applying migrations..."
    for migration in ../migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "  📄 Running $(basename $migration)..."
            psql "$url" -f "$migration"
        fi
    done
    
    # Apply NeonDB configuration
    echo "⚙️  Applying NeonDB configuration..."
    psql "$url" -f ../neon-config.sql
    
    # Apply seed data
    echo "🌱 Applying seed data..."
    psql "$url" -f ../seed/dev_seed.sql
    
    echo "✅ $env_name setup complete"
}

# Main setup
if [ "$1" = "prod" ]; then
    echo "Setting up production database..."
    setup_database "$PROD_URL" "Production"
elif [ "$1" = "dev" ]; then
    echo "Setting up development database..."
    setup_database "$DEV_URL" "Development"
else
    echo "Usage: $0 [prod|dev]"
    echo ""
    echo "Options:"
    echo "  prod  - Setup production database (ep-frosty-paper)"
    echo "  dev   - Setup development database (ep-odd-boat)"
    echo ""
    echo "Environment variables:"
    echo "  NEON_DATABASE_URL - Production URL"
    echo "  DATABASE_URL      - Development URL"
    exit 1
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Connection details:"
echo "  Production: $PROD_URL"
echo "  Development: $DEV_URL"
echo ""
echo "Next steps:"
echo "1. Update your .env.local file with the appropriate URL"
echo "2. Run your application with the new configuration"
echo "3. Monitor connection usage in NeonDB dashboard"