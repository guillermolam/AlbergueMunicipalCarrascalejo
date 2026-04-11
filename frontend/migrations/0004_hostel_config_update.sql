-- Migration 0004: Populate hostel_config with real contact and location data
-- Run with: npx wrangler d1 execute DB --local --file=migrations/0004_hostel_config_update.sql

-- Delete stale placeholder row and re-insert with correct data
-- (INSERT OR REPLACE handles the single-row table cleanly)
INSERT OR REPLACE INTO hostel_config (
  id, name, tagline,
  address_street, address_postcode, address_town, address_province, address_country,
  phone, email, website,
  latitude, longitude,
  check_in_time, check_out_time, reception_hours,
  cif, tourism_license, insurance_policy,
  updated_at
) VALUES (
  1,
  'Albergue Municipal de El Carrascalejo',
  'Acogida en el Camino de Santiago — Vía de la Plata',
  'Paraje Cuesta, s/n',
  '06894',
  'El Carrascalejo',
  'Badajoz',
  'España',
  '+34 695 90 43 44',
  'elcarrascalejoalbergue@gmail.com',
  'https://alberguecarrascalejo.es',
  39.023831,
  -6.337627,
  '14:00',
  '09:00',
  '14:00–22:00',
  NULL,
  'H-CC-0023',
  NULL,
  datetime('now')
);
