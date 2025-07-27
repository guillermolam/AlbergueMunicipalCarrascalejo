-- PostgreSQL Schema for Albergue del Carrascalejo
-- Used for local development with NeonDB

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries table for nationality validation
CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    requires_visa BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pilgrims/guests table
CREATE TABLE pilgrims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('DNI', 'NIE', 'PASSPORT')),
    document_number VARCHAR(50) NOT NULL,
    document_checksum_valid BOOLEAN DEFAULT FALSE,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nationality_code VARCHAR(2) REFERENCES countries(code),
    birth_date DATE,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(50),
    -- OCR and validation data
    document_confidence DECIMAL(3,2) DEFAULT 0.0,
    ocr_extracted_data JSONB,
    validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'manual_review')),
    -- GDPR compliance
    consent_marketing BOOLEAN DEFAULT FALSE,
    consent_data_processing BOOLEAN DEFAULT TRUE,
    data_retention_until DATE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint on document
    UNIQUE(document_type, document_number)
);

-- Beds and rooms
CREATE TABLE beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_number INTEGER NOT NULL UNIQUE,
    room_type VARCHAR(20) NOT NULL CHECK (room_type IN ('dorm_a', 'dorm_b', 'private')),
    bed_type VARCHAR(20) DEFAULT 'single' CHECK (bed_type IN ('single', 'bunk_top', 'bunk_bottom')),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    max_occupancy INTEGER DEFAULT 1,
    price_per_night DECIMAL(10,2) NOT NULL,
    amenities JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings/reservations
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    bed_id UUID NOT NULL REFERENCES beds(id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'transfer', 'online')),
    -- Government submission (Spain MIR)
    mir_submission_id VARCHAR(100),
    mir_submission_status VARCHAR(20) DEFAULT 'pending' CHECK (mir_submission_status IN ('pending', 'submitted', 'confirmed', 'failed')),
    mir_submitted_at TIMESTAMP WITH TIME ZONE,
    -- Expiry management (2-hour window)
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
    -- Special requests and notes
    special_requests TEXT,
    admin_notes TEXT,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure no double bookings
    EXCLUDE USING gist (
        bed_id WITH =,
        daterange(check_in_date, check_out_date, '[)') WITH &&
    ) WHERE (status != 'cancelled' AND status != 'expired')
);

-- Payments tracking
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(20) NOT NULL,
    payment_provider VARCHAR(50), -- 'stripe', 'cash', 'bank_transfer'
    provider_transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    receipt_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Notifications log
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    pilgrim_id UUID REFERENCES pilgrims(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'reservation_created', 'payment_confirmed', etc.
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'telegram')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider_message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log for GDPR/NIS2 compliance
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    user_id VARCHAR(100), -- JWT sub claim or 'system'
    user_role VARCHAR(50),
    changed_fields JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic pricing table
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    seasonal_multiplier DECIMAL(3,2) DEFAULT 1.0,
    special_event VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    UNIQUE(room_type, effective_date)
);

-- Create indexes for performance
CREATE INDEX idx_pilgrims_document ON pilgrims(document_type, document_number);
CREATE INDEX idx_pilgrims_email ON pilgrims(email);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_expires_at ON bookings(expires_at) WHERE status = 'reserved';
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room_type ON beds(room_type);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pilgrims_updated_at BEFORE UPDATE ON pilgrims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for automatic booking expiry
CREATE OR REPLACE FUNCTION expire_unpaid_bookings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE bookings 
    SET status = 'expired'
    WHERE status = 'reserved' 
    AND expires_at < NOW()
    AND payment_status = 'pending';
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Run expiry check every 5 minutes
CREATE OR REPLACE FUNCTION create_booking_expiry_job()
RETURNS void AS $$
BEGIN
    -- This would be replaced with a proper cron job or background task
    -- For now, just a placeholder function
END;
$$ language 'plpgsql';