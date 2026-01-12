#!/bin/bash
set -e

echo " SQLite Schema Dump"

# Configuration
SQLITE_DB=${SQLITE_DATABASE:-"./albergue.db"}
OUTPUT_FILE="database/schemas/sqlite_current.sql"

if [ ! -f "$SQLITE_DB" ]; then
    echo " Error: SQLite database not found: $SQLITE_DB"
    exit 1
fi

echo " Database: $SQLITE_DB"
echo " Output: $OUTPUT_FILE"

# Dump schema only
sqlite3 "$SQLITE_DB" ".schema" > "$OUTPUT_FILE"

echo " Schema dumped successfully!"

# Show table info
echo ""
echo " Tables in database:"
sqlite3 "$SQLITE_DB" "
SELECT name, type 
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%'
ORDER BY name;"