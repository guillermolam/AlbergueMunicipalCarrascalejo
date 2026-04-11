-- ─────────────────────────────────────────────────────────────────────────────
-- seed_dev.sql — Development seed data for local wrangler dev
-- Run with: wrangler d1 execute albergue-bookings --local --file migrations/seed_dev.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Admin user ───────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO users (id, username, password, created_at) VALUES
  (1, 'admin', '$2b$10$dev.placeholder.not.real', datetime('now'));

-- ── Hostel config ─────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO hostel_config (
  id, name, tagline,
  address_street, address_postcode, address_town, address_province, address_country,
  phone, email, website,
  latitude, longitude,
  check_in_time, check_out_time, reception_hours,
  cif, tourism_license, insurance_policy
) VALUES (
  1,
  'Albergue Municipal de El Carrascalejo',
  'Camino de Santiago — Vía de la Plata',
  'Calle del Camino, s/n', '06910', 'El Carrascalejo', 'Badajoz', 'España',
  '+34 924 000 000', 'albergue@carrascalejo.es', 'https://alberguecarrascalejo.es',
  39.0617, -6.0423,
  '14:00', '10:00', '08:00–22:00',
  'P-06000000-B', 'H-BA-0001', 'POL-00000001'
);

-- ── Dormitories ──────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO dormitories (id, name, room_type, beds_count, active, notes) VALUES
  (1, 'Dormitorio A', 'dormitory', 12, 1, 'Planta baja — acceso adaptado'),
  (2, 'Dormitorio B', 'dormitory', 12, 1, 'Primera planta'),
  (3, 'Habitación Privada 1', 'private', 2, 1, 'Cuarto doble con baño privado'),
  (4, 'Habitación Privada 2', 'private', 2, 1, 'Cuarto doble con vistas al jardín');

-- ── Pricing rules ─────────────────────────────────────────────────────────────
INSERT OR REPLACE INTO pricing_rules (id, accommodation_type, price_cents, currency, valid_from, valid_until, label, active) VALUES
  (1, 'dormitory', 800,  'EUR', NULL, NULL, 'Tarifa estándar cama en dormitorio', 1),
  (2, 'private',   2500, 'EUR', NULL, NULL, 'Tarifa estándar habitación privada', 1);

-- ── Hostel services ───────────────────────────────────────────────────────────
INSERT OR REPLACE INTO hostel_services (id, name, description, icon, price_cents, unit, available, category) VALUES
  (1, 'Desayuno',        'Desayuno continental 7:00–9:00',          '☕', 350, 'por persona', 1, 'comidas'),
  (2, 'Lavandería',      'Lavado + secado de ropa',                 '🧺', 300, 'por ciclo',   1, 'servicios'),
  (3, 'Toalla',          'Alquiler de toalla',                      '🛁', 100, 'por noche',   1, 'servicios'),
  (4, 'Mapa Camino',     'Mapa plastificado de la Vía de la Plata', '🗺️', 150, 'por unidad',  1, 'camino'),
  (5, 'Sello peregrino', 'Sello oficial del albergue para la credencial', '🔖', 0, 'gratuito', 1, 'camino');

-- ── Pilgrims (columns use _encrypted suffix but store plaintext in dev) ───────
INSERT OR IGNORE INTO pilgrims (
  id,
  first_name_encrypted, last_name_1_encrypted, last_name_2_encrypted,
  birth_date_encrypted, document_type, document_number_encrypted,
  nationality_encrypted, phone_encrypted, email_encrypted, address_encrypted,
  arrival_date, departure_date, accommodation_type, status
) VALUES
  (1, 'María',   'García',   'López',     '1985-03-22', 'DNI',      '12345678Z', 'ESP', '+34 600 111 222',     'maria@example.com',     'Calle Mayor 1, Carrascalejo',   date('now', '-1 day'), date('now'),           'dormitory', 'active'),
  (2, 'James',   'Wilson',   NULL,        '1978-07-15', 'PASSPORT', 'AB123456',  'GBR', '+44 7700 900000',     'james@example.co.uk',   '10 Downing St, London',         date('now'),           date('now', '+1 day'), 'dormitory', 'active'),
  (3, 'Pierre',  'Dubois',   'Martin',    '1992-11-30', 'PASSPORT', 'FR789012',  'FRA', '+33 6 12 34 56 78',   'pierre@example.fr',     '15 Rue de la Paix, Paris',      date('now', '-2 day'), date('now', '+1 day'), 'dormitory', 'active'),
  (4, 'Ana',     'Martínez', 'Rodríguez', '1990-05-08', 'DNI',      '87654321X', 'ESP', '+34 611 333 444',     'ana@example.es',        'Avenida de España 5, Cáceres',  date('now', '+1 day'), date('now', '+3 day'), 'private',   'active'),
  (5, 'Klaus',   'Müller',   NULL,        '1965-09-20', 'PASSPORT', 'DE345678',  'DEU', '+49 151 12345678',    'klaus@example.de',      'Hauptstraße 10, München',       date('now', '+2 day'), date('now', '+4 day'), 'dormitory', 'active');

-- ── Bookings ─────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO bookings (
  id, pilgrim_id, guest_name, guest_email, guest_phone,
  room_type, check_in, check_out, num_guests, total_price, status, payment_status
) VALUES
  ('bk-0001', 1, 'María García',   'maria@example.com',     '+34 600 111 222',   'dormitory', date('now', '-1 day'),  date('now'),           1, 800,  'confirmed',  'paid'),
  ('bk-0002', 2, 'James Wilson',   'james@example.co.uk',   '+44 7700 900000',   'dormitory', date('now'),           date('now', '+1 day'), 1, 800,  'confirmed',  'paid'),
  ('bk-0003', 3, 'Pierre Dubois',  'pierre@example.fr',     '+33 6 12 34 56 78', 'dormitory', date('now', '-2 day'), date('now', '+1 day'), 1, 2400, 'checked_in', 'paid'),
  ('bk-0004', 4, 'Ana Martínez',   'ana@example.es',        '+34 611 333 444',   'private',   date('now', '+1 day'), date('now', '+3 day'), 2, 5000, 'confirmed',  'unpaid'),
  ('bk-0005', 5, 'Klaus Müller',   'klaus@example.de',      '+49 151 12345678',  'dormitory', date('now', '+2 day'), date('now', '+4 day'), 1, 1600, 'pending',    'unpaid'),
  -- Past booking for calendar/availability testing
  ('bk-0006', 1, 'María García',   'maria@example.com',     '+34 600 111 222',   'dormitory', date('now', '-7 day'), date('now', '-5 day'), 1, 1600, 'checked_out','paid');

-- ── Reviews ───────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO reviews (id, pilgrim_id, source, rating, title, content, created_at) VALUES
  (1, 1, 'direct', 5, 'Perfecto para el Camino',       'Albergue limpio, acogedor y con buenas instalaciones. Los hospitaleros son muy amables. Lo recomiendo 100%.', datetime('now', '-5 day')),
  (2, 3, 'direct', 4, 'Très bien!',                    'Bel albergue, propre et bien situé sur la Via de la Plata. Dortoirs spacieux. Je recommande.',                 datetime('now', '-2 day')),
  (3, 2, 'google', 5, 'Excellent stop on Via de la Plata', 'Clean, friendly, and affordable. The hospitaleros were incredibly helpful with route advice.',             datetime('now', '-1 day'));

-- ── Payments ─────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO payments (id, booking_id, amount, currency, status, payment_method) VALUES
  (1, 'bk-0001', 800,  'EUR', 'completed', 'cash'),
  (2, 'bk-0002', 800,  'EUR', 'completed', 'card'),
  (3, 'bk-0003', 2400, 'EUR', 'completed', 'cash'),
  (6, 'bk-0006', 1600, 'EUR', 'completed', 'cash');
