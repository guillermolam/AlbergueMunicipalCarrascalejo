-- =============================================================================
-- Migration 0002: Admin-configurable tables
-- Dormitories, pricing rules, hostel services, hostel config
-- =============================================================================

CREATE TABLE IF NOT EXISTS dormitories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  room_type   TEXT NOT NULL DEFAULT 'dormitory',
  beds_count  INTEGER NOT NULL DEFAULT 12,
  active      INTEGER NOT NULL DEFAULT 1,  -- 0 | 1
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing_rules (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  accommodation_type    TEXT NOT NULL DEFAULT 'dormitory',
  price_cents           INTEGER NOT NULL DEFAULT 800,
  currency              TEXT NOT NULL DEFAULT 'EUR',
  valid_from            TEXT,
  valid_until           TEXT,
  label                 TEXT,
  active                INTEGER NOT NULL DEFAULT 1,  -- 0 | 1
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hostel_services (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT NOT NULL DEFAULT '🏨',
  price_cents INTEGER NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'por uso',
  available   INTEGER NOT NULL DEFAULT 1,  -- 0 | 1
  category    TEXT NOT NULL DEFAULT 'general',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hostel_config (
  id                INTEGER PRIMARY KEY DEFAULT 1,
  name              TEXT NOT NULL DEFAULT 'Albergue Municipal de El Carrascalejo',
  tagline           TEXT,
  address_street    TEXT,
  address_postcode  TEXT,
  address_town      TEXT,
  address_province  TEXT,
  address_country   TEXT,
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  latitude          REAL,
  longitude         REAL,
  check_in_time     TEXT,
  check_out_time    TEXT,
  reception_hours   TEXT,
  cif               TEXT,
  tourism_license   TEXT,
  insurance_policy  TEXT,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Seed data
-- =============================================================================

-- Dormitory rooms
INSERT OR IGNORE INTO dormitories (name, room_type, beds_count, active) VALUES
  ('Dormitorio A', 'dormitory', 14, 1),
  ('Dormitorio B', 'dormitory', 14, 1),
  ('Habitación Privada 1', 'private', 2, 1);

-- Default pricing rule (€8 per night)
INSERT OR IGNORE INTO pricing_rules (accommodation_type, price_cents, label, active) VALUES
  ('dormitory', 800, 'Tarifa base — litera', 1),
  ('private',  2500, 'Tarifa base — habitación privada', 1);

-- Default services
INSERT OR IGNORE INTO hostel_services (name, icon, price_cents, unit, available, category) VALUES
  ('Desayuno',         '☕', 350, 'por persona',  1, 'food'),
  ('Cena peregrino',   '🍽️', 1000, 'por persona', 1, 'food'),
  ('Lavadora',         '🧺', 250, 'por lavada',   1, 'laundry'),
  ('Secadora',         '💨', 200, 'por secada',   1, 'laundry'),
  ('Sello credencial', '📮',   0, 'gratuito',     1, 'camino'),
  ('Parking bici',     '🚲',   0, 'gratuito',     1, 'transport'),
  ('Wi-Fi',            '📶',   0, 'gratuito',     1, 'facilities'),
  ('Cocina peregrinos','🍳',   0, 'gratuito',     1, 'facilities');

-- Hostel identity
INSERT OR IGNORE INTO hostel_config (
  id, name, tagline,
  address_street, address_postcode, address_town, address_province, address_country,
  phone, email, website,
  latitude, longitude,
  check_in_time, check_out_time, reception_hours
) VALUES (
  1, 'Albergue Municipal de El Carrascalejo',
  'Acogida en el Camino de Santiago — Vía de la Plata',
  'Calle Mayor, s/n', '06185', 'El Carrascalejo', 'Badajoz', 'España',
  NULL, NULL, NULL,
  39.0456, -6.1234,
  '14:00', '09:00', '14:00–22:00'
);
