-- ─────────────────────────────────────────────────────────────────────────────
-- 0002_accommodation_config.sql
--
-- Adds configurable tables for:
--   • dormitories   — number of dorms and beds per dorm (admin-editable)
--   • pricing_rules — price per night with optional date ranges (seasonal)
--   • hostel_services — extra services offered (laundry, towels, etc.)
--
-- All monetary values are stored in EUR cents (integer) to avoid float rounding.
-- ─────────────────────────────────────────────────────────────────────────────

-- Dormitory / room configuration
-- Each row = one physical dormitory.  Changing beds_count here changes the
-- capacity shown to guests and the availability calculation.
CREATE TABLE IF NOT EXISTS dormitories (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,                          -- "Dormitorio A"
    room_type    TEXT    NOT NULL DEFAULT 'dormitory',      -- 'dormitory' | 'private'
    beds_count   INTEGER NOT NULL DEFAULT 12,
    active       INTEGER NOT NULL DEFAULT 1,               -- 0 = closed for maintenance
    notes        TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Price per night rules with optional date ranges.
-- The most-specific active rule for a given date wins
-- (narrowest valid_from..valid_until range, falling back to the open-ended default).
CREATE TABLE IF NOT EXISTS pricing_rules (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    accommodation_type   TEXT    NOT NULL DEFAULT 'dormitory',
    price_cents          INTEGER NOT NULL DEFAULT 800,      -- €8.00 = 800 cents
    currency             TEXT    NOT NULL DEFAULT 'EUR',
    valid_from           TEXT,                              -- NULL = no start bound
    valid_until          TEXT,                              -- NULL = open-ended
    label                TEXT,                             -- "Tarifa estándar", "Semana Santa"
    active               INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Extra hostel services that can be booked / displayed to pilgrims.
-- Price 0 = free service.
CREATE TABLE IF NOT EXISTS hostel_services (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    description  TEXT,
    icon         TEXT    NOT NULL DEFAULT '🏨',
    price_cents  INTEGER NOT NULL DEFAULT 0,
    unit         TEXT    NOT NULL DEFAULT 'por uso',
    available    INTEGER NOT NULL DEFAULT 1,
    category     TEXT    NOT NULL DEFAULT 'general',
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Seed: default dormitory layout (2 × 12 beds = 24 total) ─────────────────
INSERT OR IGNORE INTO dormitories (id, name, room_type, beds_count) VALUES
    (1, 'Dormitorio A', 'dormitory', 12),
    (2, 'Dormitorio B', 'dormitory', 12);

-- ── Seed: default pricing (€8/night year-round) ──────────────────────────────
INSERT OR IGNORE INTO pricing_rules (id, accommodation_type, price_cents, label) VALUES
    (1, 'dormitory', 800, 'Tarifa estándar');

-- Example seasonal rule — disabled by default (active=0).
-- Enable and adjust dates via the admin panel to activate peak pricing.
INSERT OR IGNORE INTO pricing_rules
    (accommodation_type, price_cents, valid_from, valid_until, label, active)
VALUES
    ('dormitory', 1000, '2026-06-21', '2026-09-22', 'Tarifa verano', 0),
    ('dormitory', 1200, '2026-04-14', '2026-04-19', 'Semana Santa',  0);

-- ── Seed: default hostel services ────────────────────────────────────────────
INSERT OR IGNORE INTO hostel_services (id, name, description, icon, price_cents, unit, available, category) VALUES
    (1,  'Lavadora',          'Detergente incluido. Capacidad 7 kg.',              '🧺', 100,  'por uso',      1, 'laundry'),
    (2,  'Secadora',          'Ciclo de 60 min. Ropa seca garantizada.',           '🌀', 200,  'por uso',      1, 'laundry'),
    (3,  'Toalla',            'Toalla de baño limpia y seca.',                     '🛁', 100,  'por día',      1, 'linen'),
    (4,  'Taquilla',          'Candado con clave. Tamaño mochila grande.',         '🔒', 100,  'por noche',    1, 'storage'),
    (5,  'Desayuno',          'Café, tostadas, fruta y zumo. 7:00–9:30h.',        '🥐', 350,  'por persona',  0, 'food'),
    (6,  'Parking Bicicleta', 'Zona cubierta y vigilada.',                         '🚲', 200,  'por noche',    1, 'transport'),
    (7,  'Guardar Mochila',   'Deja la mochila y explora el pueblo.',              '📦', 100,  'tarifa única', 1, 'storage'),
    (8,  'Carga Dispositivos','Enchufes USB-A y USB-C en recepción.',              '⚡',  50,  'por hora',     0, 'tech'),
    (9,  'Kit Higiene',       'Champú, gel, pasta y cepillo de dientes.',          '🧼', 150,  'por kit',      1, 'hygiene'),
    (10, 'Botiquín',          'Tiritas, Compeed y vendas disponibles.',            '🩹',   0,  'gratuito',     1, 'health');

-- Hostel identity and legal configuration (single authoritative row, id=1)
CREATE TABLE IF NOT EXISTS hostel_config (
    id                INTEGER PRIMARY KEY DEFAULT 1,  -- always 1
    name              TEXT NOT NULL DEFAULT 'Albergue Municipal de El Carrascalejo',
    tagline           TEXT DEFAULT 'Camino de Santiago — Vía de la Plata',
    address_street    TEXT DEFAULT 'Calle del Camino, s/n',
    address_postcode  TEXT DEFAULT '06910',
    address_town      TEXT DEFAULT 'El Carrascalejo',
    address_province  TEXT DEFAULT 'Badajoz',
    address_country   TEXT DEFAULT 'España',
    phone             TEXT DEFAULT '+34 924 XXX XXX',
    email             TEXT DEFAULT 'info@alberguecarrascalejo.es',
    website           TEXT DEFAULT 'https://alberguecarrascalejo.es',
    latitude          REAL DEFAULT 39.0617,
    longitude         REAL DEFAULT -6.0423,
    check_in_time     TEXT DEFAULT '14:00',
    check_out_time    TEXT DEFAULT '10:00',
    reception_hours   TEXT DEFAULT '08:00–22:00',
    cif               TEXT DEFAULT 'X-00000000',
    tourism_license   TEXT DEFAULT 'H-CC-0023',
    insurance_policy  TEXT DEFAULT 'XXXX-XXXX',
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed the single config row
INSERT OR IGNORE INTO hostel_config (id) VALUES (1);
