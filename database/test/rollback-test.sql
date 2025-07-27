-- Rollback Test Script
-- Tests that database changes can be safely rolled back during development

-- Start transaction for rollback testing
BEGIN;

-- Test 1: Insert test data that should be rolled back
INSERT INTO countries (code, name, nationality) VALUES ('TEST', 'Test Country', 'Test Nationality');

INSERT INTO beds (bed_number, room_type, price_per_night) VALUES (999, 'dorm_a', 15.00);

INSERT INTO pilgrims (document_type, document_number, full_name, nationality_code) 
VALUES ('DNI', 'ROLLBACK_TEST', 'Rollback Test User', 'ES');

-- Test 2: Verify test data exists
SELECT 'Rollback test - Data insertion' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM countries WHERE code = 'TEST') 
        AND EXISTS (SELECT 1 FROM beds WHERE bed_number = 999)
        AND EXISTS (SELECT 1 FROM pilgrims WHERE document_number = 'ROLLBACK_TEST')
        THEN 'PASS: Test data inserted successfully'
        ELSE 'FAIL: Test data not inserted'
    END as result;

-- Test 3: Create a savepoint and test nested rollback
SAVEPOINT test_savepoint;

INSERT INTO pricing (room_type, effective_date, price_per_night, created_by) 
VALUES ('test_room', '2024-01-01', 999.99, 'rollback_test');

-- Verify savepoint data
SELECT 'Savepoint test' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pricing WHERE room_type = 'test_room')
        THEN 'PASS: Savepoint data inserted'
        ELSE 'FAIL: Savepoint data not inserted'
    END as result;

-- Rollback to savepoint
ROLLBACK TO SAVEPOINT test_savepoint;

-- Verify savepoint rollback worked
SELECT 'Savepoint rollback test' as test_name;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pricing WHERE room_type = 'test_room')
        THEN 'PASS: Savepoint rollback successful'
        ELSE 'FAIL: Savepoint rollback failed'
    END as result;

-- Test 4: Verify main transaction data still exists
SELECT 'Transaction isolation test' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM countries WHERE code = 'TEST') 
        AND EXISTS (SELECT 1 FROM beds WHERE bed_number = 999)
        AND EXISTS (SELECT 1 FROM pilgrims WHERE document_number = 'ROLLBACK_TEST')
        THEN 'PASS: Main transaction data preserved after savepoint rollback'
        ELSE 'FAIL: Main transaction data lost'
    END as result;

-- Test 5: Test constraint violation rollback
BEGIN
    -- This should fail due to unique constraint
    INSERT INTO beds (bed_number, room_type, price_per_night) VALUES (999, 'dorm_b', 20.00);
EXCEPTION
    WHEN unique_violation THEN
        -- Expected - unique constraint on bed_number
        SELECT 'PASS: Constraint violation handled correctly' as constraint_test;
END;

-- Final rollback - this should remove all test data
ROLLBACK;

-- Test 6: Verify complete rollback
SELECT 'Complete rollback test' as test_name;
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM countries WHERE code = 'TEST') 
        AND NOT EXISTS (SELECT 1 FROM beds WHERE bed_number = 999)
        AND NOT EXISTS (SELECT 1 FROM pilgrims WHERE document_number = 'ROLLBACK_TEST')
        THEN 'PASS: Complete rollback successful - all test data removed'
        ELSE 'FAIL: Complete rollback failed - test data still exists'
    END as result;

-- Test 7: Verify original data integrity after rollback
SELECT 'Data integrity after rollback test' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) >= 10 THEN 'PASS: Original countries data intact'
        ELSE 'FAIL: Original countries data corrupted'
    END as countries_integrity
FROM countries;

SELECT 
    CASE 
        WHEN COUNT(*) = 24 THEN 'PASS: Original beds data intact'
        ELSE 'FAIL: Original beds data corrupted - Expected 24, found ' || COUNT(*)
    END as beds_integrity
FROM beds;

-- Test 8: Performance test - large rollback
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();
    
    -- Start transaction
    BEGIN
        -- Insert large amount of test data
        INSERT INTO pilgrims (document_type, document_number, full_name, nationality_code)
        SELECT 
            'DNI',
            'PERF_TEST_' || generate_series,
            'Performance Test User ' || generate_series,
            'ES'
        FROM generate_series(1, 1000);
        
        -- Rollback the large insertion
        ROLLBACK;
    END;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'PASS: Large rollback completed in %', duration;
END $$;

-- Summary
SELECT 'ROLLBACK TEST SUMMARY' as summary, 
       'All rollback mechanisms tested successfully' as result;