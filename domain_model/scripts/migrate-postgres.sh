#!/bin/bash
set -e

echo "🐘 PostgreSQL Migration Script"

# Configuration
# Use appropriate database URL based on environment
if [ -n "$NEON_DATABASE_URL" ] && [ "$NODE_ENV" = "production" ]; then
    DB_URL="$NEON_DATABASE_URL"
else
    DB_URL="${DATABASE_URL:-postgresql://localhost:5432/albergue_dev}"
fi

echo "📡 Connecting to: $(echo $DB_URL | sed 's/.*@//' | sed 's/\/.*//')"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found. Install PostgreSQL client."
    exit 1
fi

# Create migrations table if it doesn't exist
psql "$DB_URL" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);"

# Run migrations in order
echo "📝 Running migrations..."
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        filename=$(basename "$migration_file")
        version="${filename%%.sql}"

        # Check if migration already executed
        if psql "$DB_URL" -tAc "SELECT 1 FROM schema_migrations WHERE version = '$version';" | grep -q 1; then
            echo "   ⏭️  $filename (already executed)"
        else
            echo "   ▶️  Executing $filename"
            psql "$DB_URL" -f "$migration_file"
            psql "$DB_URL" -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
            echo "   ✅ $filename completed"
        fi
    fi
done

echo "✅ PostgreSQL migrations completed!"

# Show migration status
echo ""
echo "📋 Migration History:"
psql "$DB_URL" -c "SELECT version, executed_at FROM schema_migrations ORDER BY executed_at;"