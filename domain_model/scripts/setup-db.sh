#!/bin/bash
set -e

echo "  Complete Database Setup for Albergue del Carrascalejo"

# Configuration
# Use NEON_DATABASE_URL for production, DATABASE_URL for development
DB_URL=${NEON_DATABASE_URL:-$DATABASE_URL}
SEED_TYPE=${1:-dev} # 'dev' or 'test'

# Validate database URLs
if [ -z "$DB_URL" ]; then
	echo " Error: NEON_DATABASE_URL or DATABASE_URL environment variable not set"
	echo "   Production: $NEON_DATABASE_URL"
	echo "   Development: $DATABASE_URL"
	echo "   Set your database connection string in Replit Secrets or .env.local"
	exit 1
fi

# Detect environment based on URL
if [[ $DB_URL == *"pooler"* ]]; then
	if [[ $DB_URL == *"frosty-paper"* ]]; then
		ENVIRONMENT="Production (NeonDB Pooler)"
	elif [[ $DB_URL == *"odd-boat"* ]]; then
		ENVIRONMENT="Development (NeonDB Pooler)"
	else
		ENVIRONMENT="NeonDB Pooler"
	fi
else
	ENVIRONMENT="Local PostgreSQL"
fi

echo " Environment: $ENVIRONMENT"
echo " Database: $(echo $DB_URL | sed 's/.*@//' | sed 's/\..*//')"
echo " Seed type: $SEED_TYPE"

# Check dependencies
if ! command -v psql &>/dev/null; then
	echo " Error: psql not found. Install PostgreSQL client tools."
	exit 1
fi

# For NeonDB, we don't drop/recreate databases - use migrations instead
if [[ $DB_URL == *"neon.tech"* ]]; then
	echo " Using NeonDB - applying migrations instead of drop/recreate"

	# Apply migrations
	echo " Applying database migrations..."
	for migration in ../migrations/*.sql; do
		if [ -f "$migration" ]; then
			echo "   Running $(basename $migration)..."
			psql "$DB_URL" -f "$migration"
		fi
	done

	# Apply seed data
	echo " Applying seed data..."
	if [ "$SEED_TYPE" = "test" ]; then
		psql "$DB_URL" -f ../seed/test_seed.sql
	else
		psql "$DB_URL" -f ../seed/dev_seed.sql
	fi

	echo " Database setup complete for NeonDB"
	exit 0
fi

# Local PostgreSQL setup (only for localhost)
if [[ $SEED_TYPE == "dev" && $DB_URL == *"localhost"* ]]; then
	echo "  Dropping and recreating local database..."
	DB_NAME=$(echo $DB_URL | sed 's/.*\///')
	ADMIN_URL=$(echo $DB_URL | sed 's/\/[^\/]*$/\/postgres/')

	# Check if we can connect to admin database
	if psql "$ADMIN_URL" -c "SELECT 1;" &>/dev/null; then
		psql "$ADMIN_URL" -c "DROP DATABASE IF EXISTS $DB_NAME;"
		psql "$ADMIN_URL" -c "CREATE DATABASE $DB_NAME;"
	else
		echo "  Cannot connect to admin database, skipping drop/create"
	fi
fi

# Apply migrations
echo " Applying database migrations..."
for migration in ../migrations/*.sql; do
	if [ -f "$migration" ]; then
		echo "   Running $(basename $migration)..."
		psql "$DB_URL" -f "$migration"
	fi
done

# Apply seed data
echo " Applying seed data..."
if [ "$SEED_TYPE" = "test" ]; then
	psql "$DB_URL" -f ../seed/test_seed.sql
else
	psql "$DB_URL" -f ../seed/dev_seed.sql
fi

echo " Database setup complete"
