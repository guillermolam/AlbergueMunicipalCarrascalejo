-- Development seed data for testing and demonstration
-- Includes sample pilgrims, bookings, and realistic scenarios

-- Insert 24 beds (12 dorm A + 10 dorm B + 2 private)
INSERT INTO beds (bed_number, room_type, bed_type, price_per_night, amenities) VALUES
    -- Dorm A (12 beds) - bunk beds
    (1, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (2, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (3, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (4, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (5, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (6, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (7, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (8, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (9, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (10, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (11, 'dorm_a', 'bunk_bottom', 15.00, '["locker", "reading_light", "usb_charging"]'),
    (12, 'dorm_a', 'bunk_top', 15.00, '["locker", "reading_light", "usb_charging"]'),
    -- Dorm B (10 beds) - mix of bunks and singles
    (13, 'dorm_b', 'bunk_bottom', 15.00, '["locker", "reading_light"]'),
    (14, 'dorm_b', 'bunk_top', 15.00, '["locker", "reading_light"]'),
    (15, 'dorm_b', 'bunk_bottom', 15.00, '["locker", "reading_light"]'),
    (16, 'dorm_b', 'bunk_top', 15.00, '["locker", "reading_light"]'),
    (17, 'dorm_b', 'single', 15.00, '["locker", "reading_light", "window_view"]'),
    (18, 'dorm_b', 'single', 15.00, '["locker", "reading_light", "window_view"]'),
    (19, 'dorm_b', 'bunk_bottom', 15.00, '["locker", "reading_light"]'),
    (20, 'dorm_b', 'bunk_top', 15.00, '["locker", "reading_light"]'),
    (21, 'dorm_b', 'bunk_bottom', 15.00, '["locker", "reading_light"]'),
    (22, 'dorm_b', 'bunk_top', 15.00, '["locker", "reading_light"]'),
    -- Private rooms (2 beds)
    (23, 'private', 'single', 35.00, '["private_bathroom", "tv", "desk", "wardrobe", "wifi"]'),
    (24, 'private', 'single', 35.00, '["private_bathroom", "tv", "desk", "wardrobe", "wifi"]')
ON CONFLICT (bed_number) DO NOTHING;

-- Insert common countries for Camino pilgrims
INSERT INTO countries (code, name, nationality, requires_visa) VALUES
    ('ES', 'España', 'Española', FALSE),
    ('PT', 'Portugal', 'Portuguesa', FALSE),
    ('FR', 'Francia', 'Francesa', FALSE),
    ('DE', 'Alemania', 'Alemana', FALSE),
    ('IT', 'Italia', 'Italiana', FALSE),
    ('GB', 'Reino Unido', 'Británica', FALSE),
    ('IE', 'Irlanda', 'Irlandesa', FALSE),
    ('NL', 'Países Bajos', 'Neerlandesa', FALSE),
    ('BE', 'Bélgica', 'Belga', FALSE),
    ('US', 'Estados Unidos', 'Estadounidense', FALSE),
    ('CA', 'Canadá', 'Canadiense', FALSE),
    ('AU', 'Australia', 'Australiana', FALSE),
    ('BR', 'Brasil', 'Brasileña', TRUE),
    ('AR', 'Argentina', 'Argentina', TRUE),
    ('KR', 'Corea del Sur', 'Coreana', TRUE),
    ('JP', 'Japón', 'Japonesa', TRUE),
    ('PL', 'Polonia', 'Polaca', FALSE),
    ('CZ', 'República Checa', 'Checa', FALSE)
ON CONFLICT (code) DO NOTHING;

-- Sample pilgrims with realistic data
INSERT INTO pilgrims (document_type, document_number, full_name, email, phone, nationality_code, birth_date, validation_status, consent_data_processing, document_confidence) VALUES
    ('DNI', '12345678A', 'María García López', 'maria.garcia@email.com', '+34666123456', 'ES', '1985-03-15', 'valid', TRUE, 0.98),
    ('PASSPORT', 'P12345678', 'John Smith', 'john.smith@email.com', '+441234567890', 'GB', '1978-07-22', 'valid', TRUE, 0.95),
    ('NIE', 'X1234567L', 'Pierre Dubois', 'pierre.dubois@email.fr', '+33123456789', 'FR', '1990-11-08', 'valid', TRUE, 0.97),
    ('DNI', '87654321B', 'Ana Rodríguez Martín', 'ana.rodriguez@email.com', '+34677987654', 'ES', '1992-05-30', 'valid', TRUE, 0.99),
    ('PASSPORT', 'G87654321', 'Klaus Müller', 'klaus.muller@email.de', '+491234567890', 'DE', '1983-12-03', 'valid', TRUE, 0.96)
ON CONFLICT (document_type, document_number) DO NOTHING;

-- Sample bookings (some current, some historical)
WITH pilgrim_ids AS (
    SELECT id, document_number FROM pilgrims WHERE document_number IN ('12345678A', 'P12345678', 'X1234567L')
),
bed_ids AS (
    SELECT id, bed_number FROM beds WHERE bed_number IN (1, 15, 23)
)
INSERT INTO bookings (pilgrim_id, bed_id, check_in_date, check_out_date, total_amount, status, payment_status, payment_method)
SELECT 
    p.id, 
    b.id, 
    CASE 
        WHEN p.document_number = '12345678A' THEN CURRENT_DATE + 1
        WHEN p.document_number = 'P12345678' THEN CURRENT_DATE + 3
        ELSE CURRENT_DATE + 7
    END,
    CASE 
        WHEN p.document_number = '12345678A' THEN CURRENT_DATE + 3
        WHEN p.document_number = 'P12345678' THEN CURRENT_DATE + 5
        ELSE CURRENT_DATE + 9
    END,
    CASE 
        WHEN b.bed_number = 23 THEN 70.00  -- private room, 2 nights
        ELSE 30.00  -- dorm bed, 2 nights
    END,
    'confirmed',
    'paid',
    'card'
FROM pilgrim_ids p
JOIN bed_ids b ON (
    (p.document_number = '12345678A' AND b.bed_number = 1) OR
    (p.document_number = 'P12345678' AND b.bed_number = 15) OR
    (p.document_number = 'X1234567L' AND b.bed_number = 23)
);

-- Sample payments for the bookings
INSERT INTO payments (booking_id, amount, payment_method, payment_provider, status, provider_transaction_id)
SELECT 
    b.id,
    b.total_amount,
    'card',
    'stripe',
    'completed',
    'pi_' || substr(md5(random()::text), 1, 24)
FROM bookings b
WHERE b.status = 'confirmed';

-- Sample notifications
INSERT INTO notifications (booking_id, pilgrim_id, notification_type, channel, recipient, subject, message, status, sent_at)
SELECT 
    b.id,
    b.pilgrim_id,
    'reservation_confirmed',
    'email',
    p.email,
    'Reserva confirmada - Albergue del Carrascalejo',
    'Su reserva ha sido confirmada. Check-in: ' || b.check_in_date || ', Check-out: ' || b.check_out_date,
    'delivered',
    NOW() - INTERVAL '1 hour'
FROM bookings b
JOIN pilgrims p ON b.pilgrim_id = p.id
WHERE b.status = 'confirmed' AND p.email IS NOT NULL;