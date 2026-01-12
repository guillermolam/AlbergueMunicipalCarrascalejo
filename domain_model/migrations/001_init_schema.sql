-- Initial schema for Albergue del Carrascalejo management system
-- Based on services/shared/schema.ts types and requirements
-- Optimized for NeonDB with connection pooling

-- Enable necessary extensions for NeonDB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pilgrims table with GDPR/NIS2 compliance (encrypted fields)
CREATE TABLE IF NOT EXISTS pilgrims (
    id SERIAL PRIMARY KEY,
    -- Encrypted personal data (marked with _encrypted suffix)
    first_name_encrypted TEXT NOT NULL,
    last_name_1_encrypted TEXT NOT NULL,
    last_name_2_encrypted TEXT,
    birth_date_encrypted TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number_encrypted TEXT NOT NULL,
    nationality_encrypted TEXT NOT NULL,
    phone_encrypted TEXT,
    email_encrypted TEXT,
    address_encrypted TEXT,
    
    -- Non-encrypted operational data
    arrival_date DATE NOT NULL,
    departure_date DATE,
    accommodation_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- GDPR compliance fields
    consent_given BOOLEAN DEFAULT TRUE,
    consent_date TIMESTAMP DEFAULT NOW(),
    data_retention_until DATE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_pilgrims_arrival (arrival_date),
    INDEX idx_pilgrims_status (status),
    INDEX idx_pilgrims_created (created_at)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    pilgrim_id INTEGER NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    accommodation_type VARCHAR(50) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE,
    nights INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_bookings_pilgrim (pilgrim_id),
    INDEX idx_bookings_checkin (check_in_date),
    INDEX idx_bookings_status (status)
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    pilgrim_id INTEGER NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_reviews_pilgrim (pilgrim_id),
    INDEX idx_reviews_rating (rating)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    pilgrim_id INTEGER REFERENCES pilgrims(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_notifications_pilgrim (pilgrim_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_scheduled (scheduled_for)
);

-- Info on arrival table
CREATE TABLE IF NOT EXISTS info_on_arrival (
    id SERIAL PRIMARY KEY,
    pilgrim_id INTEGER NOT NULL REFERENCES pilgrims(id) ON DELETE CASCADE,
    info_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'es',
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_info_pilgrim (pilgrim_id),
    INDEX idx_info_type (info_type),
    INDEX idx_info_language (language)
);

-- Location services table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    type VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_locations_type (type),
    INDEX idx_locations_coords (latitude, longitude)
);

-- Audit log table for GDPR/NIS2 compliance
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    INDEX idx_audit_table (table_name),
    INDEX idx_audit_record (table_name, record_id),
    INDEX idx_audit_timestamp (timestamp)
);

-- Pricing table
CREATE TABLE IF NOT EXISTS pricing (
    id SERIAL PRIMARY KEY,
    accommodation_type VARCHAR(50) NOT NULL UNIQUE,
    price_per_night DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default pricing
INSERT INTO pricing (accommodation_type, price_per_night, currency) VALUES
    ('albergue', 8.00, 'EUR'),
    ('hostal', 25.00, 'EUR'),
    ('hotel', 45.00, 'EUR')
ON CONFLICT (accommodation_type) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_pilgrims_updated_at BEFORE UPDATE ON pilgrims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance with NeonDB
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pilgrims_document_hash 
    ON pilgrims USING HASH (document_number_encrypted);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date_range 
    ON bookings (check_in_date, check_out_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
    ON notifications (pilgrim_id, is_read) WHERE is_read = FALSE;