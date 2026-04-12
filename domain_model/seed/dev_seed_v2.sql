-- ============================================================================
-- Development seed: default hostel layout
--
-- Hostel defaults:
--   2 dorms (A & B), each mixed
--   6 bunks per dorm
--   2 beds per bunk (top + bottom)
--   Total: 24 beds (numbered 1–24)
-- ============================================================================

BEGIN;

-- ── HOSTEL CONFIG ────────────────────────────────────────────────────────────
INSERT INTO hostel_config (
  id, hostel_name, email, phone,
  address_street, address_city, address_postal_code, address_province,
  check_in_time, check_out_time,
  wifi_ssid, wifi_password,
  default_price_per_night_eur_cents, max_booking_days_in_advance,
  max_nights_per_booking, booking_lock_ttl_minutes,
  legal_name, legal_info
) VALUES (
  1, 'Albergue Municipal Carrascalejo', 'info@alberguecarrascalejo.es', '+34927000000',
  'Plaza del Ayuntamiento, 1', 'Carrascalejo', '10392', 'Cáceres',
  '14:00', '11:00',
  'Albergue_WiFi', 'bienvenidos2026',
  1500, 365,
  30, 30,
  'Ayuntamiento de Carrascalejo', 'Albergue municipal regido por el Ayuntamiento de Carrascalejo. Acogida de peregrinos del Camino de Santiago.'
)
ON CONFLICT (id) DO UPDATE SET
  email                             = EXCLUDED.email,
  phone                             = EXCLUDED.phone,
  wifi_ssid                         = EXCLUDED.wifi_ssid,
  wifi_password                     = EXCLUDED.wifi_password,
  default_price_per_night_eur_cents = EXCLUDED.default_price_per_night_eur_cents;

-- ── BUILDING ─────────────────────────────────────────────────────────────────
INSERT INTO buildings (id, name, description, floors)
VALUES (1, 'Edificio Principal', 'Edificio principal del albergue', 1)
ON CONFLICT DO NOTHING;

-- ── DORMS ────────────────────────────────────────────────────────────────────
INSERT INTO dorms (id, building_id, name, type, floor, description)
VALUES
  (1, 1, 'Dormitorio A', 'mixed', 0, 'Dormitorio mixto A — 12 camas'),
  (2, 1, 'Dormitorio B', 'mixed', 0, 'Dormitorio mixto B — 12 camas')
ON CONFLICT DO NOTHING;

-- ── BED BUNKS (6 per dorm) ───────────────────────────────────────────────────
INSERT INTO bed_bunks (id, dorm_id, bunk_number, label)
SELECT
  (dorm_id - 1) * 6 + bunk_number AS id,
  dorm_id,
  bunk_number,
  format('%s%s', CASE dorm_id WHEN 1 THEN 'A' ELSE 'B' END, bunk_number) AS label
FROM
  generate_series(1, 2) AS dorm_id,
  generate_series(1, 6) AS bunk_number
ON CONFLICT DO NOTHING;

-- ── BEDS (2 per bunk — top + bottom, numbered 1–24) ─────────────────────────
INSERT INTO beds (id, bunk_id, dorm_id, position, bed_number, label, status)
SELECT
  (bunk_id - 1) * 2 + CASE pos WHEN 'bottom' THEN 1 ELSE 2 END AS id,
  bunk_id,
  CASE WHEN bunk_id <= 6 THEN 1 ELSE 2 END AS dorm_id,
  pos::bed_position AS position,
  (bunk_id - 1) * 2 + CASE pos WHEN 'bottom' THEN 1 ELSE 2 END AS bed_number,
  format('%s-%s',
    CASE WHEN bunk_id <= 6 THEN 'A' ELSE 'B' END || ((bunk_id - 1) % 6 + 1),
    CASE pos WHEN 'bottom' THEN 'Inf' ELSE 'Sup' END
  ) AS label,
  'available' AS status
FROM
  generate_series(1, 12) AS bunk_id,
  (VALUES ('bottom'), ('top')) AS t(pos)
ON CONFLICT DO NOTHING;

-- ── PRICING RULES (seasonal examples) ────────────────────────────────────────
INSERT INTO pricing_rules (dorm_id, bed_id, valid_from, valid_to, price_per_night_eur_cents, label, priority)
VALUES
  -- High season (July–August): €18/night for all beds
  (NULL, NULL, '2026-07-01', '2026-08-31', 1800, 'Temporada Alta 2026', 10),
  -- Semana Santa: €20/night
  (NULL, NULL, '2026-03-29', '2026-04-05', 2000, 'Semana Santa 2026', 20)
ON CONFLICT DO NOTHING;

-- ── SERVICES ─────────────────────────────────────────────────────────────────
INSERT INTO services (name, category, description, price_cents, sort_order)
VALUES
  ('Desayuno',           'food',      'Desayuno continental de 7:00 a 9:00',       400,  1),
  ('Cena de peregrino',  'food',      'Menú peregrino: sopa, segundo y postre',     900,  2),
  ('Lavadora',           'laundry',   'Uso de lavadora (1 ciclo)',                  300,  3),
  ('Secadora',           'laundry',   'Uso de secadora (1 ciclo)',                  200,  4),
  ('Consigna',           'storage',   'Custodia de equipaje hasta las 18:00',        0,   5),
  ('Alquiler de bici',   'transport', 'Bicicleta por día',                          800,  6),
  ('Sellado de credencial', 'other',  'Sello oficial del Camino de Santiago',         0,   7)
ON CONFLICT DO NOTHING;

-- ── STAFF ────────────────────────────────────────────────────────────────────
INSERT INTO staff (first_name, last_name, role, is_public_contact, sort_order)
VALUES
  ('Hospitalero', 'Principal', 'Hospitalero/a', true, 1)
ON CONFLICT DO NOTHING;

-- ── SOCIAL NETWORKS ──────────────────────────────────────────────────────────
INSERT INTO social_networks (platform, handle, url, is_active, sort_order)
VALUES
  ('facebook',  'alberguecarrascalejo', 'https://www.facebook.com/alberguecarrascalejo', true, 1),
  ('instagram', 'alberguecarrascalejo', 'https://www.instagram.com/alberguecarrascalejo', true, 2)
ON CONFLICT DO NOTHING;

COMMIT;
