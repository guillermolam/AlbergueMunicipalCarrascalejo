-- =============================================================================
-- Migration 0001: Core operational tables
-- Bookings, beds, pricing — runtime data written by SSR Worker
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id              TEXT PRIMARY KEY,
  pilgrim_id      INTEGER,
  guest_name      TEXT,
  guest_email     TEXT,
  guest_phone     TEXT,
  room_type       TEXT NOT NULL DEFAULT 'dormitory',
  check_in        TEXT NOT NULL,
  check_out       TEXT,
  num_guests      INTEGER NOT NULL DEFAULT 1,
  total_price     INTEGER NOT NULL DEFAULT 800,  -- cents
  status          TEXT DEFAULT 'pending',
  payment_status  TEXT DEFAULT 'unpaid',
  special_requests TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS beds (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  room_number     TEXT NOT NULL,
  bed_number      INTEGER NOT NULL,
  room_type       TEXT NOT NULL DEFAULT 'dormitory',
  status          TEXT NOT NULL DEFAULT 'available',
  price_per_night INTEGER NOT NULL DEFAULT 800,  -- cents
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  accommodation_type    TEXT NOT NULL,
  price_per_night       INTEGER NOT NULL,  -- cents
  currency              TEXT DEFAULT 'EUR',
  valid_from            TEXT DEFAULT (date('now')),
  valid_until           TEXT,
  created_at            TEXT DEFAULT (datetime('now'))
);
