-- ============================================================================
-- Migration 006: Comprehensive schema v2
--
-- Redesigns the full data model to support:
--   - Hostel configuration (singleton)
--   - Buildings → Dorms → Bed Bunks → Beds hierarchy
--   - Date-range pricing rules
--   - Services with images
--   - Staff & social networks
--   - Clerk-linked users with document scan URLs
--   - Multi-guest bookings (primary pilgrim + booking_guests)
--   - Race-condition-safe bed allocation (UNIQUE bed+night)
--   - Optimistic locking (version column on bookings)
--   - Full booking lifecycle statuses
--   - Payment tracking, government submissions, notifications, audit log
--
-- Run AFTER migrations 001–005.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).
-- ============================================================================

BEGIN;

-- ── EXTENSIONS ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMS ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE dorm_type AS ENUM ('mixed', 'male', 'female');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bed_position AS ENUM ('top', 'bottom', 'single');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bed_status AS ENUM ('available', 'reserved', 'occupied', 'maintenance');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending', 'in_progress', 'confirmed', 'paid',
    'checked_in', 'checked_out', 'cancelled', 'reimbursed', 'no_show', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card', 'cash', 'transfer', 'stripe', 'paypal', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('dni', 'nie', 'passport');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'whatsapp', 'telegram', 'push');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE gov_submission_status AS ENUM ('pending', 'submitted', 'accepted', 'rejected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE service_category AS ENUM ('food', 'transport', 'laundry', 'storage', 'activity', 'wellness', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM ('insert', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('pilgrim', 'staff', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── HOSTEL CONFIGURATION (singleton, id = 1) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS hostel_config (
  id                              INTEGER PRIMARY KEY DEFAULT 1,
  hostel_name                     TEXT    NOT NULL DEFAULT 'Albergue Municipal Carrascalejo',
  legal_name                      TEXT,
  tax_id                          TEXT,
  legal_info                      TEXT,
  email                           TEXT    NOT NULL,
  phone                           TEXT    NOT NULL,
  address_street                  TEXT    NOT NULL,
  address_city                    TEXT    NOT NULL DEFAULT 'Carrascalejo',
  address_postal_code             TEXT    NOT NULL,
  address_province                TEXT    DEFAULT 'Cáceres',
  address_country                 TEXT    DEFAULT 'ES',
  latitude                        TEXT,
  longitude                       TEXT,
  check_in_time                   TEXT    NOT NULL DEFAULT '14:00',
  check_out_time                  TEXT    NOT NULL DEFAULT '11:00',
  wifi_ssid                       TEXT,
  wifi_password                   TEXT,
  wifi_notes                      TEXT,
  -- Prices stored as integer euro-cents (€15.00 = 1500)
  default_price_per_night_eur_cents  INTEGER NOT NULL DEFAULT 1500,
  max_booking_days_in_advance        INTEGER NOT NULL DEFAULT 365,
  max_nights_per_booking             INTEGER NOT NULL DEFAULT 30,
  -- null = derived from total active bed count
  max_people_per_booking_override    INTEGER,
  -- How long an in_progress booking holds beds before auto-expiry (minutes)
  booking_lock_ttl_minutes           INTEGER NOT NULL DEFAULT 30,
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_hostel_singleton CHECK (id = 1),
  CONSTRAINT chk_check_in_format  CHECK (check_in_time  ~ '^\d{2}:\d{2}$'),
  CONSTRAINT chk_check_out_format CHECK (check_out_time ~ '^\d{2}:\d{2}$'),
  CONSTRAINT chk_price_positive   CHECK (default_price_per_night_eur_cents > 0),
  CONSTRAINT chk_max_advance      CHECK (max_booking_days_in_advance > 0),
  CONSTRAINT chk_max_nights       CHECK (max_nights_per_booking > 0)
);

-- Upsert default config row
INSERT INTO hostel_config (id, email, phone, address_street, address_postal_code)
VALUES (1, 'info@alberguecarrascalejo.es', '+34000000000', 'Calle Principal', '10392')
ON CONFLICT (id) DO NOTHING;

-- ── BUILDINGS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  address     TEXT,
  floors      INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── DORMS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dorms (
  id           SERIAL PRIMARY KEY,
  building_id  INTEGER REFERENCES buildings(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  type         dorm_type NOT NULL DEFAULT 'mixed',
  floor        INTEGER DEFAULT 0,
  description  TEXT,
  amenities    JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Seed two default dorms
INSERT INTO dorms (name, type)
SELECT 'Dormitorio A', 'mixed' WHERE NOT EXISTS (SELECT 1 FROM dorms WHERE name = 'Dormitorio A');
INSERT INTO dorms (name, type)
SELECT 'Dormitorio B', 'mixed' WHERE NOT EXISTS (SELECT 1 FROM dorms WHERE name = 'Dormitorio B');

-- ── BED BUNKS (default: 6 per dorm) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bed_bunks (
  id           SERIAL PRIMARY KEY,
  dorm_id      INTEGER NOT NULL REFERENCES dorms(id) ON DELETE CASCADE,
  bunk_number  INTEGER NOT NULL,
  label        TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_bunk_per_dorm UNIQUE (dorm_id, bunk_number)
);

-- ── BEDS (default: 2 per bunk — top + bottom) ────────────────────────────────
--
-- bed_number is the hostel-wide unique number shown to guests ("Bed 7").
-- UNIQUE(bunk_id, position) ensures only one top and one bottom per bunk.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS beds (
  id                 SERIAL PRIMARY KEY,
  bunk_id            INTEGER     NOT NULL REFERENCES bed_bunks(id) ON DELETE CASCADE,
  dorm_id            INTEGER     NOT NULL REFERENCES dorms(id)     ON DELETE CASCADE,
  position           bed_position NOT NULL,
  bed_number         INTEGER     NOT NULL UNIQUE,
  label              TEXT,
  status             bed_status  NOT NULL DEFAULT 'available',
  notes              TEXT,
  last_cleaned_at    TIMESTAMPTZ,
  maintenance_notes  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_position_per_bunk UNIQUE (bunk_id, position)
);

-- ── PRICING RULES (date-range overrides) ─────────────────────────────────────
-- Resolution order (highest priority wins):
--   1. bed-specific rule (bed_id IS NOT NULL)
--   2. dorm-specific rule (dorm_id IS NOT NULL, bed_id IS NULL)
--   3. hostel-wide rule  (both NULL)
--   4. hostel_config.default_price_per_night_eur_cents
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
  id                        SERIAL PRIMARY KEY,
  dorm_id                   INTEGER REFERENCES dorms(id) ON DELETE CASCADE,
  bed_id                    INTEGER REFERENCES beds(id)  ON DELETE CASCADE,
  valid_from                DATE    NOT NULL,
  valid_to                  DATE    NOT NULL,
  price_per_night_eur_cents INTEGER NOT NULL,
  label                     TEXT,
  priority                  INTEGER NOT NULL DEFAULT 0,
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_pricing_date_range CHECK (valid_to >= valid_from),
  CONSTRAINT chk_pricing_positive   CHECK (price_per_night_eur_cents > 0)
);

-- ── SERVICES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  category     service_category NOT NULL DEFAULT 'other',
  description  TEXT,
  price_cents  INTEGER,     -- NULL = free / included
  currency     TEXT DEFAULT 'EUR',
  is_available BOOLEAN DEFAULT TRUE,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_service_price CHECK (price_cents IS NULL OR price_cents >= 0)
);

CREATE TABLE IF NOT EXISTS service_images (
  id         SERIAL PRIMARY KEY,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  image_url  TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STAFF ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id                SERIAL PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  role              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  whatsapp          TEXT,
  telegram_handle   TEXT,
  is_public_contact BOOLEAN DEFAULT FALSE,
  photo_url         TEXT,
  bio               TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── SOCIAL NETWORKS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_networks (
  id              SERIAL PRIMARY KEY,
  platform        TEXT NOT NULL,
  handle          TEXT,
  url             TEXT NOT NULL,
  followers_count INTEGER,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── USERS (Clerk-linked) ─────────────────────────────────────────────────────
-- Drop old users table and recreate with Clerk FK.
-- WARNING: this drops existing rows if any.
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id                    SERIAL PRIMARY KEY,
  clerk_user_id         TEXT NOT NULL UNIQUE,
  email                 TEXT NOT NULL UNIQUE,
  phone                 TEXT,
  role                  user_role NOT NULL DEFAULT 'pilgrim',
  -- R2 URLs to identity document scans
  id_document_url       TEXT,
  passport_document_url TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── PILGRIMS (one row per physical person) ───────────────────────────────────
-- PII fields are AES-256-GCM encrypted by the application before writing.
DROP TABLE IF EXISTS pilgrims CASCADE;
CREATE TABLE pilgrims (
  id                                SERIAL PRIMARY KEY,
  user_id                           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- PII — encrypted at application layer
  first_name_encrypted              TEXT NOT NULL,
  last_name_encrypted               TEXT NOT NULL,
  last_name_2_encrypted             TEXT,
  date_of_birth_encrypted           TEXT NOT NULL,
  document_type                     document_type NOT NULL,
  document_number_encrypted         TEXT NOT NULL,
  document_support_number           TEXT,   -- NIE support # (not PII)
  -- Document scan copies stored in R2
  id_document_scan_url              TEXT,
  passport_scan_url                 TEXT,
  gender                            TEXT NOT NULL,
  nationality_code                  TEXT NOT NULL,   -- ISO 3166-1 alpha-2
  -- Contact — encrypted
  phone_encrypted                   TEXT NOT NULL,
  email_encrypted                   TEXT,
  -- Emergency contact — encrypted
  emergency_contact_name_encrypted  TEXT,
  emergency_contact_phone_encrypted TEXT,
  -- Address — encrypted
  address_street_encrypted          TEXT NOT NULL,
  address_city_encrypted            TEXT NOT NULL,
  address_postal_code               TEXT NOT NULL,
  address_province                  TEXT,
  address_country                   TEXT NOT NULL,   -- ISO 3166-1 alpha-2
  address_municipality_code         TEXT,
  language                          TEXT DEFAULT 'es',
  -- GDPR
  data_consent_given                BOOLEAN NOT NULL DEFAULT FALSE,
  data_consent_at                   TIMESTAMPTZ,
  data_retention_until              DATE,     -- 3 years after last stay (minimum ES legal)
  created_at                        TIMESTAMPTZ DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKINGS ─────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS bookings CASCADE;
CREATE TABLE bookings (
  id                    SERIAL PRIMARY KEY,
  reference_number      TEXT NOT NULL UNIQUE,
  -- Primary person is always mandatory
  primary_pilgrim_id    INTEGER NOT NULL REFERENCES pilgrims(id) ON DELETE RESTRICT,
  -- Clerk user who created the booking (NULL = walk-in / staff-entered)
  user_id               INTEGER REFERENCES users(id) ON DELETE SET NULL,
  check_in_date         DATE NOT NULL,
  check_out_date        DATE NOT NULL,
  number_of_nights      INTEGER NOT NULL,
  -- Must be ≤ number of beds allocated; enforced in middleware before commit
  number_of_people      INTEGER NOT NULL DEFAULT 1,
  status                booking_status NOT NULL DEFAULT 'pending',
  total_amount_cents    INTEGER NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'EUR',
  notes                 TEXT,
  estimated_arrival_time TEXT,   -- HH:MM
  -- Optimistic locking: middleware reads this, then does UPDATE … WHERE version = $read_version
  version               INTEGER NOT NULL DEFAULT 0,
  -- Lifecycle timestamps
  locks_expires_at      TIMESTAMPTZ,   -- when in_progress bed locks expire
  confirmed_at          TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,
  checked_in_at         TIMESTAMPTZ,
  checked_out_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_booking_dates        CHECK (check_out_date > check_in_date),
  CONSTRAINT chk_booking_nights       CHECK (number_of_nights > 0),
  CONSTRAINT chk_booking_people       CHECK (number_of_people >= 1),
  CONSTRAINT chk_booking_amount       CHECK (total_amount_cents >= 0)
);

-- ── BOOKING GUESTS (additional persons beyond the primary pilgrim) ─────────────
CREATE TABLE IF NOT EXISTS booking_guests (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  pilgrim_id  INTEGER NOT NULL REFERENCES pilgrims(id)  ON DELETE RESTRICT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_guest_per_booking UNIQUE (booking_id, pilgrim_id)
);

-- ── BOOKING BEDS (bed allocation — one row per bed per night) ─────────────────
--
-- UNIQUE(bed_id, night_date) is the DB-level singleton guard.
-- PostgreSQL rejects concurrent INSERTs for the same (bed, night),
-- making application-level mutexes / Durable Objects optional.
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS booking_beds CASCADE;
CREATE TABLE booking_beds (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  bed_id      INTEGER NOT NULL REFERENCES beds(id)      ON DELETE RESTRICT,
  night_date  DATE    NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_bed_per_night UNIQUE (bed_id, night_date)
);

-- ── PAYMENTS ─────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS payments CASCADE;
CREATE TABLE payments (
  id                   SERIAL PRIMARY KEY,
  booking_id           INTEGER NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount_cents         INTEGER NOT NULL,
  currency             TEXT    NOT NULL DEFAULT 'EUR',
  payment_method       payment_method NOT NULL,
  status               payment_status NOT NULL DEFAULT 'pending',
  gateway_payment_id   TEXT,
  gateway_response     JSONB,
  receipt_number       TEXT,
  paid_at              TIMESTAMPTZ,
  refunded_at          TIMESTAMPTZ,
  refund_amount_cents  INTEGER,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_payment_amount         CHECK (amount_cents > 0),
  CONSTRAINT chk_payment_refund_amount  CHECK (refund_amount_cents IS NULL OR refund_amount_cents >= 0)
);

-- ── GOVERNMENT SUBMISSIONS (Spanish SES/Mossos XML per person per booking) ────
DROP TABLE IF EXISTS government_submissions CASCADE;
CREATE TABLE government_submissions (
  id                 SERIAL PRIMARY KEY,
  booking_id         INTEGER NOT NULL REFERENCES bookings(id)  ON DELETE RESTRICT,
  pilgrim_id         INTEGER NOT NULL REFERENCES pilgrims(id)  ON DELETE RESTRICT,
  xml_content        TEXT    NOT NULL,
  submission_status  gov_submission_status NOT NULL DEFAULT 'pending',
  submitted_at       TIMESTAMPTZ,
  response_data      JSONB,
  attempts           INTEGER NOT NULL DEFAULT 0,
  last_attempt_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS notifications CASCADE;
CREATE TABLE notifications (
  id                  SERIAL PRIMARY KEY,
  booking_id          INTEGER REFERENCES bookings(id)  ON DELETE SET NULL,
  pilgrim_id          INTEGER REFERENCES pilgrims(id)  ON DELETE SET NULL,
  channel             notification_channel  NOT NULL,
  recipient           TEXT NOT NULL,
  subject             TEXT,
  body                TEXT NOT NULL,
  status              notification_status NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── AUDIT LOG (GDPR / NIS2) ──────────────────────────────────────────────────
DROP TABLE IF EXISTS audit_log CASCADE;
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  table_name  TEXT NOT NULL,
  record_id   INTEGER NOT NULL,
  action      audit_action NOT NULL,
  old_values  JSONB,
  new_values  JSONB,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────

-- Availability calendar lookup: all active bookings for a date range
CREATE INDEX IF NOT EXISTS idx_booking_beds_night_date       ON booking_beds(night_date);
CREATE INDEX IF NOT EXISTS idx_booking_beds_booking_id       ON booking_beds(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_beds_bed_id           ON booking_beds(bed_id);

-- Booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_status               ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in             ON bookings(check_in_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id              ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_primary_pilgrim      ON bookings(primary_pilgrim_id);
CREATE INDEX IF NOT EXISTS idx_bookings_locks_expires_at     ON bookings(locks_expires_at)
  WHERE status = 'in_progress';

-- Bed status queries
CREATE INDEX IF NOT EXISTS idx_beds_status                   ON beds(status);
CREATE INDEX IF NOT EXISTS idx_beds_dorm_id                  ON beds(dorm_id);

-- Pricing rule resolution
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active_dates    ON pricing_rules(valid_from, valid_to)
  WHERE is_active = TRUE;

-- Pilgrim / user lookups
CREATE INDEX IF NOT EXISTS idx_pilgrims_user_id              ON pilgrims(user_id);
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id           ON users(clerk_user_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id      ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status          ON notifications(status)
  WHERE status = 'pending';

-- Government submissions
CREATE INDEX IF NOT EXISTS idx_gov_submissions_booking_id    ON government_submissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_gov_submissions_status        ON government_submissions(submission_status)
  WHERE submission_status IN ('pending', 'error');

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record        ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at          ON audit_log(created_at);

-- ── UPDATED_AT TRIGGERS ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'hostel_config', 'buildings', 'dorms', 'beds', 'pricing_rules',
    'services', 'staff', 'users', 'pilgrims', 'bookings', 'payments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I;
       CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl, tbl, tbl
    );
  END LOOP;
END $$;

COMMIT;
