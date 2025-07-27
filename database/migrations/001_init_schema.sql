-- Initial schema for Albergue del Carrascalejo management system
-- Based on services/shared/schema.ts types and requirements

-- Users table for authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pilgrims table with GDPR/NIS2 compliance (encrypted fields)
CREATE TABLE pilgrims (
    id SERIAL PRIMARY KEY,
    -- Encrypted personal data (marked with _encrypted suffix)
    first_name_encrypted TEXT NOT NULL,
    last_name_1_encrypted TEXT NOT NULL,
    last_name_2_encrypted TEXT,
    birth_date_encrypted TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_number_encrypted TEXT NOT NULL,
    document_support VARCHAR(100),
    gender VARCHAR(10) NOT NULL,
    nationality VARCHAR(100),
    phone_encrypted TEXT NOT NULL,
    email_encrypted TEXT,
    address_country VARCHAR(100) NOT NULL,
    address_street_encrypted TEXT NOT NULL,
    address_street_2_encrypted TEXT,
    address_city_encrypted TEXT NOT NULL,
    address_postal_code VARCHAR(20) NOT NULL,
    address_province VARCHAR(100),
    address_municipality_code VARCHAR(20),
    id_photo_url TEXT,
    language VARCHAR(10) DEFAULT 'es',
    -- GDPR compliance fields
    consent_given BOOLEAN DEFAULT TRUE,
    consent_date TIMESTAMP DEFAULT NOW(),
    data_retention_until TIMESTAMP,
    last_access_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Beds table for room and bed management
CREATE TABLE beds (
    id SERIAL PRIMARY KEY,
    bed_number INTEGER NOT NULL,
    room_number INTEGER NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    room_type VARCHAR(50) DEFAULT 'dormitory', -- dormitory, private
    price_per_night DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    currency VARCHAR(10) DEFAULT 'EUR',
    is_available BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'available', -- available, reserved, occupied, maintenance, cleaning
    reserved_until TIMESTAMP,
    last_cleaned_at TIMESTAMP,
    maintenance_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    pilgrim_id INTEGER REFERENCES pilgrims(id) NOT NULL,
    reference_number VARCHAR(100) NOT NULL UNIQUE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_nights INTEGER NOT NULL,
    number_of_persons INTEGER DEFAULT 1,
    number_of_rooms INTEGER DEFAULT 1,
    has_internet BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'reserved', -- reserved, confirmed, checked_in, checked_out, cancelled, expired
    bed_assignment_id INTEGER REFERENCES beds(id),
    estimated_arrival_time VARCHAR(20),
    notes TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    -- Reservation timeout fields (2-hour window)
    reservation_expires_at TIMESTAMP NOT NULL,
    payment_deadline TIMESTAMP NOT NULL,
    auto_cleanup_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- efect, tarjeta, bizum, transferencia
    payment_status VARCHAR(50) DEFAULT 'awaiting_payment', -- awaiting_payment, completed, failed, cancelled, expired
    currency VARCHAR(10) DEFAULT 'EUR',
    receipt_number VARCHAR(100),
    payment_date TIMESTAMP,
    payment_deadline TIMESTAMP NOT NULL,
    transaction_id VARCHAR(255),
    gateway_response JSONB, -- For card payments
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pricing table for dynamic pricing
CREATE TABLE pricing (
    id SERIAL PRIMARY KEY,
    room_type VARCHAR(50) NOT NULL, -- dormitory, private
    bed_type VARCHAR(50) NOT NULL, -- shared, private
    price_per_night DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Government submissions table for SOAP API compliance
CREATE TABLE government_submissions (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) NOT NULL,
    xml_content TEXT NOT NULL,
    submission_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    response_data JSONB,
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default pricing data
INSERT INTO pricing (room_type, bed_type, price_per_night, currency) VALUES
('dormitory', 'shared', 15.00, 'EUR');

-- Insert default bed configuration: 3 dormitorios with 8 beds each (24 total beds)
INSERT INTO beds (bed_number, room_number, room_name, room_type, price_per_night) VALUES
-- Dormitorio 1: 8 beds
(1, 1, 'Dormitorio 1', 'dormitory', 15.00),
(2, 1, 'Dormitorio 1', 'dormitory', 15.00),
(3, 1, 'Dormitorio 1', 'dormitory', 15.00),
(4, 1, 'Dormitorio 1', 'dormitory', 15.00),
(5, 1, 'Dormitorio 1', 'dormitory', 15.00),
(6, 1, 'Dormitorio 1', 'dormitory', 15.00),
(7, 1, 'Dormitorio 1', 'dormitory', 15.00),
(8, 1, 'Dormitorio 1', 'dormitory', 15.00),
-- Dormitorio 2: 8 beds
(1, 2, 'Dormitorio 2', 'dormitory', 15.00),
(2, 2, 'Dormitorio 2', 'dormitory', 15.00),
(3, 2, 'Dormitorio 2', 'dormitory', 15.00),
(4, 2, 'Dormitorio 2', 'dormitory', 15.00),
(5, 2, 'Dormitorio 2', 'dormitory', 15.00),
(6, 2, 'Dormitorio 2', 'dormitory', 15.00),
(7, 2, 'Dormitorio 2', 'dormitory', 15.00),
(8, 2, 'Dormitorio 2', 'dormitory', 15.00),
-- Dormitorio 3: 8 beds
(1, 3, 'Dormitorio 3', 'dormitory', 15.00),
(2, 3, 'Dormitorio 3', 'dormitory', 15.00),
(3, 3, 'Dormitorio 3', 'dormitory', 15.00),
(4, 3, 'Dormitorio 3', 'dormitory', 15.00),
(5, 3, 'Dormitorio 3', 'dormitory', 15.00),
(6, 3, 'Dormitorio 3', 'dormitory', 15.00),
(7, 3, 'Dormitorio 3', 'dormitory', 15.00),
(8, 3, 'Dormitorio 3', 'dormitory', 15.00);

-- Create indexes for performance
CREATE INDEX idx_bookings_pilgrim_id ON bookings(pilgrim_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room ON beds(room_number, room_name);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(payment_status);