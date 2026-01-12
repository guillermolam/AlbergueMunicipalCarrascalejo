#!/bin/bash
set -e

echo " PostgreSQL Schema Dump"

# Configuration
DB_URL=${NEON_DATABASE_URL:-$DATABASE_URL}
OUTPUT_FILE="database/schemas/postgres_current.sql"

if [ -z "$DB_URL" ]; then
    echo " Error: NEON_DATABASE_URL or DATABASE_URL not set"
    exit 1
fi

echo " Connecting to: $(echo $DB_URL | sed 's/.*@//' | sed 's/\/.*//')"
echo " Output: $OUTPUT_FILE"

# Dump schema only (no data)
pg_dump "$DB_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --exclude-table=schema_migrations \
    > "$OUTPUT_FILE"

echo " Schema dumped successfully!"

# Show table count
echo ""
echo " Tables in schema:"
psql "$DB_URL" -c "
SELECT schemaname, tablename, tableowner 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;"