-- SQLite Schema for Albergue del Carrascalejo
-- Used for Spin/Fermyon deployment (free tier)

-- Countries table for nationality validation
CREATE TABLE countries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    nationality TEXT NOT NULL,
    requires_visa INTEGER DEFAULT 0, -- SQLite uses INTEGER for boolean
    created_at TEXT DEFAULT (datetime('now'))
);

-- Pilgrims/guests table
CREATE TABLE pilgrims (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    document_type TEXT NOT NULL CHECK (document_type IN ('DNI', 'NIE', 'PASSPORT')),
    document_number TEXT NOT NULL,
    document_checksum_valid INTEGER DEFAULT 0,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    nationality_code TEXT REFERENCES countries(code),
    birth_date TEXT, -- SQLite uses TEXT for dates
    emergency_contact TEXT,
    emergency_phone TEXT,
    -- OCR and validation data
    document_confidence REAL DEFAULT 0.0,
    ocr_extracted_data TEXT, -- JSON as TEXT in SQLite
    validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'manual_review')),
    -- GDPR compliance
    consent_marketing INTEGER DEFAULT 0,
    consent_data_processing INTEGER DEFAULT 1,
    data_retention_until TEXT,
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    -- Unique constraint on document
    UNIQUE(document_type, document_number)
);

-- Beds and rooms
CREATE TABLE beds (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    bed_number INTEGER NOT NULL UNIQUE,
    room_type TEXT NOT NULL CHECK (room_type IN ('dorm_a', 'dorm_b', 'private')),
    bed_type TEXT DEFAULT 'single' CHECK (bed_type IN ('single', 'bunk_top', 'bunk_bottom')),
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    max_occupancy INTEGER DEFAULT 1,
    price_per_night REAL NOT NULL,
    amenities TEXT DEFAULT '[]', -- JSON as TEXT
    created_at TEXT DEFAULT (datetime('now'))
);

-- Bookings/reservations
CREATE TABLE bookings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pilgrim_id TEXT NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    bed_id TEXT NOT NULL REFERENCES beds(id),
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    nights INTEGER, -- Calculated in application logic
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'online')),
    -- Government submission (Spain MIR)
    mir_submission_id TEXT,
    mir_submission_status TEXT DEFAULT 'pending' CHECK (mir_submission_status IN ('pending', 'submitted', 'confirmed', 'failed')),
    mir_submitted_at TEXT,
    -- Expiry management (2-hour window)
    expires_at TEXT DEFAULT (datetime('now', '+2 hours')),
    -- Special requests and notes
    special_requests TEXT,
    admin_notes TEXT,
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Payments tracking
CREATE TABLE payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'EUR',
    payment_method TEXT NOT NULL,
    payment_provider TEXT, -- 'stripe', 'cash', 'bank_transfer'
    provider_transaction_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    receipt_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT
);

-- Notifications log
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
    pilgrim_id TEXT REFERENCES pilgrims(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'reservation_created', 'payment_confirmed', etc.
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'telegram')),
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider_message_id TEXT,
    sent_at TEXT,
    delivered_at TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Audit log for GDPR/NIS2 compliance
CREATE TABLE audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    user_id TEXT, -- JWT sub claim or 'system'
    user_role TEXT,
    changed_fields TEXT, -- JSON as TEXT
    old_values TEXT, -- JSON as TEXT
    new_values TEXT, -- JSON as TEXT
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Dynamic pricing table
CREATE TABLE pricing (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    room_type TEXT NOT NULL,
    effective_date TEXT NOT NULL,
    price_per_night REAL NOT NULL,
    seasonal_multiplier REAL DEFAULT 1.0,
    special_event TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by TEXT,
    UNIQUE(room_type, effective_date)
);

-- Create indexes for performance
CREATE INDEX idx_pilgrims_document ON pilgrims(document_type, document_number);
CREATE INDEX idx_pilgrims_email ON pilgrims(email);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_expires_at ON bookings(expires_at);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room_type ON beds(room_type);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Triggers for updated_at timestamps (SQLite version)
CREATE TRIGGER update_pilgrims_updated_at
    AFTER UPDATE ON pilgrims
    FOR EACH ROW
    BEGIN
        UPDATE pilgrims SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER update_bookings_updated_at
    AFTER UPDATE ON bookings
    FOR EACH ROW
    BEGIN
        UPDATE bookings SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- Calculate nights on booking insert/update
CREATE TRIGGER calculate_booking_nights
    AFTER INSERT ON bookings
    FOR EACH ROW
    BEGIN
        UPDATE bookings 
        SET nights = (julianday(check_out_date) - julianday(check_in_date))
        WHERE id = NEW.id;
    END;

CREATE TRIGGER update_booking_nights
    AFTER UPDATE OF check_in_date, check_out_date ON bookings
    FOR EACH ROW
    BEGIN
        UPDATE bookings 
        SET nights = (julianday(NEW.check_out_date) - julianday(NEW.check_in_date))
        WHERE id = NEW.id;
    END;