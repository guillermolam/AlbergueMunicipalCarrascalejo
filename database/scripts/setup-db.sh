#!/bin/bash
set -e

echo "🏗️  Complete Database Setup for Albergue del Carrascalejo"

# Configuration
DB_URL=${NEON_DATABASE_URL:-$DATABASE_URL}
SEED_TYPE=${1:-dev} # 'dev' or 'test'

if [ -z "$DB_URL" ]; then
	echo "❌ Error: NEON_DATABASE_URL or DATABASE_URL environment variable not set"
	echo "   Set your database connection string in Replit Secrets"
	exit 1
fi

echo "📡 Database: $(echo $DB_URL | sed 's/.*@//' | sed 's/\/.*//')"
echo "🌱 Seed type: $SEED_TYPE"

# Check dependencies
if ! command -v psql &>/dev/null; then
	echo "❌ Error: psql not found. Install PostgreSQL client tools."
	exit 1
fi

# Drop and recreate database (development only)
if [[ $SEED_TYPE == "dev" && $DB_URL == *"localhost"* ]]; then
	echo "🗑️  Dropping and recreating local database..."
	DB_NAME=$(echo $DB_URL | sed 's/.*\///')
	ADMIN_URL=$(echo $DB_URL | sed 's/\/[^\/]*$/\/postgres/')
	psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS $DB_NAME;"
	psql "$ADMIN_URL" -c "CREATE DATABASE $DB_NAME;"
fi

# Run migrations in order
echo "📝 Running migrations..."
for migration in database/migrations/*.sql; do
	if [ -f "$migration" ]; then
		echo "   → $(basename $migration)"
		psql "$DB_URL" -f "$migration"
	fi
done

# Run seed data
if [ "$SEED_TYPE" = "dev" ] && [ -f "database/seed/dev_seed.sql" ]; then
	echo "🌱 Seeding development data..."
	psql "$DB_URL" -f "database/seed/dev_seed.sql"
elif [ "$SEED_TYPE" = "test" ] && [ -f "database/seed/test_seed.sql" ]; then
	echo "🧪 Seeding test data..."
	psql "$DB_URL" -f "database/seed/test_seed.sql"
fi

# Verify setup
echo "✅ Database setup complete!"
echo ""
echo "📊 Summary:"
psql "$DB_URL" -c "
SELECT 
    'beds' as table_name, 
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'available') as available
FROM beds
UNION ALL
SELECT 
    'countries' as table_name, 
    COUNT(*) as count,
    NULL as available
FROM countries
UNION ALL
SELECT 
    'pilgrims' as table_name, 
    COUNT(*) as count,
    NULL as available
FROM pilgrims
UNION ALL
SELECT 
    'bookings' as table_name, 
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
FROM bookings;"

echo ""
echo "🔗 Connection: $DB_URL"
