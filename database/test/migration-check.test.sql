-- Migration Check Tests
-- Validates that all migrations can be run cleanly on a fresh database

-- Test 1: Check migration tracking table
SELECT 'Migration tracking test' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
        ) THEN 'PASS: Migration tracking table exists'
        ELSE 'FAIL: Migration tracking table missing'
    END as result;

-- Test 2: Verify all migrations are recorded
SELECT 'Migration completeness test' as test_name;
WITH expected_migrations AS (
    SELECT unnest(ARRAY[
        '001_init_schema',
        '002_add_notifications', 
        '003_add_audit_log',
        '004_add_indexes',
        '005_seed_pricing'
    ]) as version
),
actual_migrations AS (
    SELECT version FROM schema_migrations
)
SELECT 
    CASE 
        WHEN COUNT(e.version) = COUNT(a.version) THEN 'PASS: All migrations executed'
        ELSE 'FAIL: Missing migrations - Expected: ' || COUNT(e.version) || ', Found: ' || COUNT(a.version)
    END as result
FROM expected_migrations e
LEFT JOIN actual_migrations a ON e.version = a.version;

-- Test 3: Check migration order (should be chronological)
SELECT 'Migration order test' as test_name;
SELECT 
    version,
    executed_at,
    CASE 
        WHEN executed_at >= LAG(executed_at, 1) OVER (ORDER BY version) OR LAG(executed_at, 1) OVER (ORDER BY version) IS NULL
        THEN 'PASS'
        ELSE 'FAIL: Out of order'
    END as order_check
FROM schema_migrations 
ORDER BY version;

-- Test 4: Verify schema structure integrity
SELECT 'Schema integrity test' as test_name;
-- Check that all expected columns exist in core tables
SELECT 
    table_name,
    COUNT(*) as column_count,
    CASE 
        WHEN table_name = 'pilgrims' AND COUNT(*) >= 15 THEN 'PASS'
        WHEN table_name = 'beds' AND COUNT(*) >= 8 THEN 'PASS'
        WHEN table_name = 'bookings' AND COUNT(*) >= 15 THEN 'PASS'
        WHEN table_name = 'payments' AND COUNT(*) >= 9 THEN 'PASS'
        WHEN table_name = 'notifications' AND COUNT(*) >= 11 THEN 'PASS'
        WHEN table_name = 'audit_log' AND COUNT(*) >= 10 THEN 'PASS'
        ELSE 'FAIL: Missing columns'
    END as column_check
FROM information_schema.columns 
WHERE table_name IN ('pilgrims', 'beds', 'bookings', 'payments', 'notifications', 'audit_log')
AND table_schema = 'public'
GROUP BY table_name;

-- Test 5: Verify indexes exist
SELECT 'Index existence test' as test_name;
SELECT 
    schemaname,
    indexname,
    tablename,
    'PASS: Index exists' as result
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Test 6: Check for orphaned data
SELECT 'Data integrity test' as test_name;
-- Check for bookings without valid pilgrims
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: No orphaned bookings'
        ELSE 'FAIL: Found ' || COUNT(*) || ' orphaned bookings'
    END as orphaned_bookings_check
FROM bookings b
LEFT JOIN pilgrims p ON b.pilgrim_id = p.id
WHERE p.id IS NULL;

-- Check for bookings without valid beds
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: No invalid bed references'
        ELSE 'FAIL: Found ' || COUNT(*) || ' invalid bed references'
    END as invalid_bed_refs_check
FROM bookings b
LEFT JOIN beds bed ON b.bed_id = bed.id
WHERE bed.id IS NULL;

-- Test 7: Verify default values
SELECT 'Default values test' as test_name;
SELECT 
    table_name,
    column_name,
    column_default,
    CASE 
        WHEN column_default IS NOT NULL THEN 'PASS: Has default'
        ELSE 'INFO: No default'
    END as default_check
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('pilgrims', 'beds', 'bookings', 'payments', 'notifications')
AND column_name IN ('status', 'created_at', 'payment_status', 'validation_status')
ORDER BY table_name, column_name;

-- Test 8: Check constraint validation
SELECT 'Constraint validation test' as test_name;
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    CASE 
        WHEN contype = 'c' THEN 'PASS: Check constraint'
        WHEN contype = 'f' THEN 'PASS: Foreign key'
        WHEN contype = 'u' THEN 'PASS: Unique constraint'
        WHEN contype = 'p' THEN 'PASS: Primary key'
        ELSE 'INFO: Other constraint'
    END as constraint_check
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.relname, c.conname;