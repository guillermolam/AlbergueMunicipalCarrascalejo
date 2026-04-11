-- D1 SQLite schema for Albergue del Carrascalejo
-- Migrated from PostgreSQL (domain_model/migrations/001_init_schema.sql)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pilgrims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name_encrypted TEXT NOT NULL,
    last_name_1_encrypted TEXT NOT NULL,
    last_name_2_encrypted TEXT,
    birth_date_encrypted TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_number_encrypted TEXT NOT NULL,
    nationality_encrypted TEXT NOT NULL,
    phone_encrypted TEXT,
    email_encrypted TEXT,
    address_encrypted TEXT,
    arrival_date TEXT NOT NULL,
    departure_date TEXT,
    accommodation_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    consent_given INTEGER DEFAULT 1,
    consent_date TEXT DEFAULT (datetime('now')),
    data_retention_until TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS beds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number TEXT NOT NULL,
    bed_number INTEGER NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'dormitory',
    status TEXT NOT NULL DEFAULT 'available',
    price_per_night INTEGER NOT NULL DEFAULT 800,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    pilgrim_id INTEGER REFERENCES pilgrims(id) ON DELETE CASCADE,
    guest_name TEXT,
    guest_email TEXT,
    guest_phone TEXT,
    room_type TEXT NOT NULL DEFAULT 'dormitory',
    check_in TEXT NOT NULL,
    check_out TEXT,
    num_guests INTEGER NOT NULL DEFAULT 1,
    total_price INTEGER NOT NULL DEFAULT 800,
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    special_requests TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    gateway_response TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    accommodation_type TEXT NOT NULL UNIQUE,
    price_per_night INTEGER NOT NULL,
    currency TEXT DEFAULT 'EUR',
    valid_from TEXT DEFAULT (date('now')),
    valid_until TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pilgrim_id INTEGER REFERENCES pilgrims(id) ON DELETE CASCADE,
    source TEXT DEFAULT 'direct',
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS government_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT REFERENCES bookings(id),
    submission_type TEXT NOT NULL,
    xml_payload TEXT,
    status TEXT DEFAULT 'pending',
    response_data TEXT,
    submitted_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pilgrim_id INTEGER REFERENCES pilgrims(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    channel TEXT DEFAULT 'email',
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    old_values TEXT,
    new_values TEXT,
    user_id INTEGER,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pilgrims_arrival ON pilgrims(arrival_date);
CREATE INDEX IF NOT EXISTS idx_pilgrims_status ON pilgrims(status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin ON bookings(check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_beds_status ON beds(status);

-- Seed default pricing
INSERT OR IGNORE INTO pricing (accommodation_type, price_per_night, currency) VALUES
    ('dormitory', 800, 'EUR'),
    ('private', 2500, 'EUR');

-- Seed beds
INSERT OR IGNORE INTO beds (room_number, bed_number, room_type, status, price_per_night) VALUES
    ('D1', 1, 'dormitory', 'available', 800),
    ('D1', 2, 'dormitory', 'available', 800),
    ('D1', 3, 'dormitory', 'available', 800),
    ('D1', 4, 'dormitory', 'available', 800),
    ('D2', 1, 'dormitory', 'available', 800),
    ('D2', 2, 'dormitory', 'available', 800),
    ('D2', 3, 'dormitory', 'available', 800),
    ('D2', 4, 'dormitory', 'available', 800);
