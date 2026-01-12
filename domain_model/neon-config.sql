-- NeonDB Configuration for Albergue del Carrascalejo
-- This file contains NeonDB-specific optimizations and settings

-- Set appropriate connection limits for NeonDB
-- These settings are automatically applied by NeonDB but can be overridden

-- Enable query performance monitoring
LOAD 'pg_stat_statements';

-- Set connection parameters optimized for connection pooling
SET statement_timeout = '30s';
SET idle_in_transaction_session_timeout = '10min';
SET lock_timeout = '5s';

-- Configure memory settings for better performance
-- These are managed by NeonDB but can be monitored
SHOW shared_buffers;
SHOW effective_cache_size;
SHOW work_mem;

-- Create monitoring views for database performance
CREATE OR REPLACE VIEW db_performance_metrics AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Create connection monitoring view
CREATE OR REPLACE VIEW connection_stats AS
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();

-- Optimize for NeonDB connection pooling
-- These settings are automatically managed but can be monitored
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';

-- Create indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pilgrims_active_status 
    ON pilgrims (status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_current 
    ON bookings (check_in_date, check_out_date, status) 
    WHERE status IN ('confirmed', 'pending');

-- Partitioning strategy for large tables (future optimization)
-- CREATE TABLE audit_log_2024 PARTITION OF audit_log 
--     FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Grant appropriate permissions for application user
-- This assumes the connection string user has appropriate privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO neondb_owner;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO neondb_owner;

-- Set up row-level security for GDPR compliance (example)
-- ALTER TABLE pilgrims ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY pilgrim_data_policy ON pilgrims
--     USING (true); -- Implement actual RLS rules based on requirements

-- Create function to monitor database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TABLE (
    database_name text,
    database_size text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        datname::text,
        pg_size_pretty(pg_database_size(datname))::text
    FROM pg_database
    WHERE datname = current_database();
END;
$$ LANGUAGE plpgsql;