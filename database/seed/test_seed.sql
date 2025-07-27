-- Minimal seed data for automated tests
-- Essential data only, no sample bookings or pilgrims

-- Essential bed configuration (minimal set for testing)
INSERT INTO beds (bed_number, room_type, price_per_night) VALUES
    (1, 'dorm_a', 15.00),
    (2, 'dorm_a', 15.00),
    (13, 'dorm_b', 15.00),
    (14, 'dorm_b', 15.00),
    (23, 'private', 35.00),
    (24, 'private', 35.00)
ON CONFLICT (bed_number) DO NOTHING;

-- Essential countries for document validation testing
INSERT INTO countries (code, name, nationality, requires_visa) VALUES
    ('ES', 'España', 'Española', FALSE),
    ('FR', 'Francia', 'Francesa', FALSE),
    ('GB', 'Reino Unido', 'Británica', FALSE),
    ('US', 'Estados Unidos', 'Estadounidense', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Test pricing data
INSERT INTO pricing (room_type, effective_date, price_per_night, created_by) VALUES
    ('dorm_a', CURRENT_DATE, 15.00, 'test'),
    ('dorm_b', CURRENT_DATE, 15.00, 'test'),
    ('private', CURRENT_DATE, 35.00, 'test')
ON CONFLICT (room_type, effective_date) DO NOTHING;