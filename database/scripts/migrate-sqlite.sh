#!/bin/bash
set -e

echo "📱 SQLite Migration Script for Spin/Fermyon"

# Configuration
SQLITE_DB=${SQLITE_DATABASE:-"./albergue.db"}
MIGRATIONS_DIR="database/migrations"

echo "📁 Database: $SQLITE_DB"

# Create database directory
mkdir -p "$(dirname "$SQLITE_DB")"

# Remove existing database for fresh start (development only)
if [ "$1" = "--fresh" ]; then
	echo "🗑️  Removing existing database..."
	rm -f "$SQLITE_DB"
fi

# Create migrations table
sqlite3 "$SQLITE_DB" "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    executed_at TEXT DEFAULT (datetime('now'))
);"

# Convert and run PostgreSQL migrations for SQLite
echo "📝 Converting and running migrations..."
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
	if [ -f "$migration_file" ]; then
		filename=$(basename "$migration_file")
		version="${filename%%.sql}"

		# Check if migration already executed
		if sqlite3 "$SQLITE_DB" "SELECT 1 FROM schema_migrations WHERE version = '$version';" | grep -q 1; then
			echo "   ⏭️  $filename (already executed)"
		else
			echo "   🔄 Converting $filename for SQLite..."

			# Convert PostgreSQL to SQLite syntax
			temp_file=$(mktemp)
			sed -e 's/CREATE EXTENSION[^;]*;//g' \
				-e 's/uuid_generate_v4()/lower(hex(randomblob(16)))/g' \
				-e 's/UUID/TEXT/g' \
				-e 's/BOOLEAN/INTEGER/g' \
				-e 's/TIMESTAMP WITH TIME ZONE/TEXT/g' \
				-e 's/TIMESTAMP/TEXT/g' \
				-e 's/JSONB/TEXT/g' \
				-e 's/DECIMAL([0-9,]*)/REAL/g' \
				-e 's/VARCHAR([0-9]*)/TEXT/g' \
				-e 's/CHAR([0-9]*)/TEXT/g' \
				-e 's/INET/TEXT/g' \
				-e 's/DEFAULT NOW()/DEFAULT (datetime('\''now'\''))/g' \
				-e 's/GENERATED ALWAYS AS[^,]*STORED//g' \
				-e '/EXCLUDE USING gist/,/WHERE/d' \
				-e '/CREATE OR REPLACE FUNCTION/,/\$\$ language/d' \
				-e '/CREATE TRIGGER.*BEFORE UPDATE/,/FUNCTION/d' \
				"$migration_file" >"$temp_file"

			echo "   ▶️  Executing $filename"
			sqlite3 "$SQLITE_DB" <"$temp_file"
			sqlite3 "$SQLITE_DB" "INSERT INTO schema_migrations (version) VALUES ('$version');"
			rm "$temp_file"
			echo "   ✅ $filename completed"
		fi
	fi
done

echo "✅ SQLite migrations completed!"

# Show migration status
echo ""
echo "📋 Migration History:"
sqlite3 "$SQLITE_DB" "SELECT version, executed_at FROM schema_migrations ORDER BY executed_at;"

echo ""
echo "📊 Database Info:"
sqlite3 "$SQLITE_DB" "
SELECT name as table_name, 
       (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=outer_table.name) as exists
FROM (
    VALUES ('beds'), ('countries'), ('pilgrims'), ('bookings'), 
           ('payments'), ('notifications'), ('audit_log'), ('pricing')
) AS outer_table(name);"
