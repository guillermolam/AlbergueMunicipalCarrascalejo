-- Database Integration Tests
-- Verifies constraints, triggers, seed state, and business logic

-- Test 1: Verify all essential tables exist
SELECT 'Table existence test' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) = 8 THEN 'PASS: All core tables exist'
        ELSE 'FAIL: Missing tables. Expected 8, found ' || COUNT(*)
    END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('countries', 'pilgrims', 'beds', 'bookings', 'payments', 'notifications', 'audit_log', 'pricing');

-- Test 2: Verify bed configuration (24 total beds)
SELECT 'Bed configuration test' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) = 24 THEN 'PASS: Correct bed count (24)'
        ELSE 'FAIL: Expected 24 beds, found ' || COUNT(*)
    END as result
FROM beds;

-- Test 3: Verify room type distribution
SELECT 'Room type distribution test' as test_name;
SELECT 
    room_type,
    COUNT(*) as count,
    CASE 
        WHEN room_type = 'dorm_a' AND COUNT(*) = 12 THEN 'PASS'
        WHEN room_type = 'dorm_b' AND COUNT(*) = 10 THEN 'PASS'
        WHEN room_type = 'private' AND COUNT(*) = 2 THEN 'PASS'
        ELSE 'FAIL'
    END as result
FROM beds 
GROUP BY room_type;

-- Test 4: Verify unique constraints
SELECT 'Unique constraint test' as test_name;
-- Try to insert duplicate bed number (should fail)
DO $$
BEGIN
    BEGIN
        INSERT INTO beds (bed_number, room_type, price_per_night) VALUES (1, 'dorm_a', 15.00);
        RAISE NOTICE 'FAIL: Duplicate bed number allowed';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'PASS: Unique constraint on bed_number works';
    END;
END $$;

-- Test 5: Verify foreign key constraints
SELECT 'Foreign key constraint test' as test_name;
DO $$
BEGIN
    BEGIN
        INSERT INTO pilgrims (document_type, document_number, full_name, nationality_code) 
        VALUES ('DNI', 'TEST123', 'Test User', 'XX');
        RAISE NOTICE 'FAIL: Invalid nationality_code allowed';
    EXCEPTION
        WHEN foreign_key_violation THEN
            RAISE NOTICE 'PASS: Foreign key constraint on nationality_code works';
    END;
END $$;

-- Test 6: Verify check constraints
SELECT 'Check constraint test' as test_name;
DO $$
BEGIN
    BEGIN
        INSERT INTO beds (bed_number, room_type, status, price_per_night) 
        VALUES (999, 'invalid_room', 'available', 15.00);
        RAISE NOTICE 'FAIL: Invalid room_type allowed';
    EXCEPTION
        WHEN check_violation THEN
            RAISE NOTICE 'PASS: Check constraint on room_type works';
    END;
END $$;

-- Test 7: Verify pricing data exists
SELECT 'Pricing data test' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) >= 3 THEN 'PASS: Pricing data exists'
        ELSE 'FAIL: Missing pricing data'
    END as result
FROM pricing;

-- Test 8: Verify countries data exists
SELECT 'Countries data test' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN 'PASS: Countries data exists'
        ELSE 'FAIL: Insufficient countries data'
    END as result
FROM countries;

-- Test 9: Verify updated_at trigger
SELECT 'Updated timestamp trigger test' as test_name;
DO $$
DECLARE
    test_id UUID;
    old_updated_at TIMESTAMP;
    new_updated_at TIMESTAMP;
BEGIN
    -- Insert test pilgrim
    INSERT INTO pilgrims (document_type, document_number, full_name, nationality_code)
    VALUES ('DNI', 'TRIGGER_TEST', 'Trigger Test', 'ES')
    RETURNING id INTO test_id;
    
    -- Get initial updated_at
    SELECT updated_at INTO old_updated_at FROM pilgrims WHERE id = test_id;
    
    -- Wait a moment
    PERFORM pg_sleep(0.1);
    
    -- Update the record
    UPDATE pilgrims SET full_name = 'Updated Name' WHERE id = test_id;
    
    -- Get new updated_at
    SELECT updated_at INTO new_updated_at FROM pilgrims WHERE id = test_id;
    
    -- Cleanup
    DELETE FROM pilgrims WHERE id = test_id;
    
    -- Check if trigger worked
    IF new_updated_at > old_updated_at THEN
        RAISE NOTICE 'PASS: Updated timestamp trigger works';
    ELSE
        RAISE NOTICE 'FAIL: Updated timestamp trigger not working';
    END IF;
END $$;

-- Test 10: Verify booking date logic
SELECT 'Booking date logic test' as test_name;
SELECT 
    bed_id,
    check_in_date,
    check_out_date,
    nights,
    CASE 
        WHEN nights = (check_out_date - check_in_date) THEN 'PASS'
        ELSE 'FAIL: Nights calculation incorrect'
    END as nights_test
FROM bookings
WHERE nights IS NOT NULL
LIMIT 5;

-- Summary
SELECT 'TEST SUMMARY' as summary, COUNT(*) as total_tests_run FROM (
    SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL 
    SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL
    SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1 UNION ALL SELECT 1
) as test_count;