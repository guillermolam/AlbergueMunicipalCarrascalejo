-- ─────────────────────────────────────────────────────────────────────────────
-- seed_dev.sql — Development seed data for albergue-pilgrims D1
-- Run with: wrangler d1 execute albergue-pilgrims --local --file migrations/seed_dev.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO pilgrim_profiles (
  id, document_type, document_number,
  first_name, middle_name, last_name, second_last_name,
  nationality, date_of_birth, home_address, country,
  avatar_key, ocr_confidence, raw_ocr_response
) VALUES
  ('prof-0001', 'DNI',      '12345678Z', 'María',  NULL, 'García',   'López',     'ESP', '1985-03-22', 'Calle Mayor 1, El Carrascalejo', 'España',      NULL, 0.95, '{}'),
  ('prof-0002', 'PASSPORT', 'AB123456',  'James',  NULL, 'Wilson',   NULL,        'GBR', '1978-07-15', '10 Downing St, London',          'Reino Unido', NULL, 0.92, '{}'),
  ('prof-0003', 'PASSPORT', 'FR789012',  'Pierre', NULL, 'Dubois',   'Martin',    'FRA', '1992-11-30', '15 Rue de la Paix, Paris',       'Francia',     NULL, 0.88, '{}'),
  ('prof-0004', 'DNI',      '87654321X', 'Ana',    NULL, 'Martínez', 'Rodríguez', 'ESP', '1990-05-08', 'Avenida de España 5, Cáceres',   'España',      NULL, 0.97, '{}'),
  ('prof-0005', 'PASSPORT', 'DE345678',  'Klaus',  NULL, 'Müller',   NULL,        'DEU', '1965-09-20', 'Hauptstraße 10, München',        'Alemania',    NULL, 0.91, '{}');
