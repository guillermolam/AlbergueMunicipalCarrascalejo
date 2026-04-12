-- =============================================================================
-- Migration 0005: Reviews, house rules, nearby attractions + hostel_config fix
-- Run with: npx wrangler d1 execute DB --local --file=migrations/0005_reviews_and_rules.sql
-- =============================================================================

-- ── Extend hostel_config with operational fields ──────────────────────────────
-- SQLite only supports ADD COLUMN (no DROP/MODIFY), so we add new columns only.

ALTER TABLE hostel_config ADD COLUMN check_in_open    TEXT DEFAULT '10:00';
ALTER TABLE hostel_config ADD COLUMN check_in_close   TEXT DEFAULT '21:00';
ALTER TABLE hostel_config ADD COLUMN check_out_open   TEXT DEFAULT '09:00';
ALTER TABLE hostel_config ADD COLUMN check_out_close  TEXT DEFAULT '11:00';
ALTER TABLE hostel_config ADD COLUMN max_nights       INTEGER DEFAULT 2;
ALTER TABLE hostel_config ADD COLUMN total_beds       INTEGER DEFAULT 24;
ALTER TABLE hostel_config ADD COLUMN languages        TEXT DEFAULT '["es","en"]';
ALTER TABLE hostel_config ADD COLUMN accessibility    TEXT DEFAULT '{"wheelchair":true,"ground_floor":true,"adapted_bathroom":true,"grab_rails":true}';
ALTER TABLE hostel_config ADD COLUMN camino_km        TEXT DEFAULT '482';
ALTER TABLE hostel_config ADD COLUMN camino_route     TEXT DEFAULT 'Via de la Plata';

-- Fix the single seed row with accurate data from Booking.com
UPDATE hostel_config SET
  address_street   = 'Paraje la cuesta, s/n',
  address_postcode = '06894',
  address_town     = 'El Carrascalejo',
  check_in_time    = '10:00',
  check_in_open    = '10:00',
  check_in_close   = '21:00',
  check_out_time   = '09:00',
  check_out_open   = '09:00',
  check_out_close  = '11:00',
  tourism_license  = 'AL-BA-0034',
  phone            = '+34 695 90 43 44',
  email            = 'elcarrascalejoalbergue@gmail.com',
  max_nights       = 2,
  total_beds       = 24,
  languages        = '["es","en"]',
  accessibility    = '{"wheelchair":true,"ground_floor":true,"adapted_bathroom":true,"grab_rails":true}',
  camino_km        = '482',
  camino_route     = 'Via de la Plata',
  updated_at       = datetime('now')
WHERE id = 1;

-- ── House rules ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_rules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  rule       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'general',
  active     INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO hostel_rules (rule, category, sort_order) VALUES
  ('Horario de silencio: 22:00 — 07:00',                          'quiet',     1),
  ('Zona de fumadores habilitada en el exterior',                   'smoking',   2),
  ('No se permiten fiestas ni eventos',                             'conduct',   3),
  ('No se admiten ninos (albergue para adultos peregrinos)',        'guests',    4),
  ('Mascotas permitidas — consultar sin cargo adicional',           'pets',      5),
  ('Documento de identidad obligatorio al llegar',                  'checkin',   6),
  ('Respeta a los demas peregrinos',                                'conduct',   7),
  ('Cancelacion gratuita 24h antes',                                'booking',   8),
  ('Pago en efectivo en el albergue',                               'payment',   9),
  ('Llegadas tardias: avisar previamente al hospitalero',           'checkin',  10);

-- ── Nearby attractions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nearby_attractions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT,
  distance_km REAL NOT NULL,
  icon        TEXT NOT NULL DEFAULT '📍',
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO nearby_attractions (name, description, distance_km, icon, sort_order) VALUES
  ('Acueducto Romano de Los Milagros',
   'Impresionante acueducto romano del siglo I d.C., Patrimonio de la Humanidad UNESCO.',
   13.0, '🏛️', 1),
  ('Basilica de Santa Eulalia',
   'Imponente basilica gotica del siglo XIV dedicada a la martir patrona de Merida.',
   14.0, '⛪', 2),
  ('Teatro Romano y Anfiteatro de Merida',
   'Teatro del siglo I a.C. perfectamente conservado y anfiteatro de gladiadores.',
   15.0, '🎭', 3),
  ('Aeropuerto de Badajoz',
   'Aeropuerto internacional con conexiones a Madrid, Barcelona y Canarias.',
   57.0, '✈️', 4);

-- ── Reviews (cached from external sources) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  source       TEXT NOT NULL,          -- 'google' | 'booking'
  author_name  TEXT,
  rating       REAL NOT NULL,
  text         TEXT,
  review_date  TEXT,
  language     TEXT DEFAULT 'es',
  verified     INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  synced_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Aggregated review scores (one row per source) ─────────────────────────────
CREATE TABLE IF NOT EXISTS review_scores (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  source          TEXT NOT NULL UNIQUE, -- 'google' | 'booking' | 'all'
  overall         REAL,
  staff           REAL,
  cleanliness     REAL,
  comfort         REAL,
  value_for_money REAL,
  facilities      REAL,
  location        REAL,
  total_count     INTEGER NOT NULL DEFAULT 0,
  label           TEXT,                -- e.g. 'Sobresaliente'
  last_synced     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed with known Booking.com scores (scraped 2026-04-12)
INSERT OR REPLACE INTO review_scores
  (source, overall, staff, cleanliness, comfort, value_for_money, facilities, location, total_count, label, last_synced)
VALUES
  ('booking', 9.1, 9.6, 9.4, 9.3, 9.6, 9.0, 9.0, 71, 'Sobresaliente', datetime('now')),
  ('google',  NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, datetime('now')),
  ('all',     9.1, 9.6, 9.4, 9.3, 9.6, 9.0, 9.0, 71, 'Sobresaliente', datetime('now'));
