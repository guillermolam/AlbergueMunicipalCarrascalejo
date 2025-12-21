-- Database migrations for pilgrim schema
-- Comprehensive schema for managing pilgrim data with security and integrity

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum types
CREATE TYPE user_role AS ENUM ('pilgrim', 'admin', 'moderator', 'accommodation_manager', 'emergency_contact');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded', 'failed');
CREATE TYPE pilgrimage_status AS ENUM ('planning', 'active', 'completed', 'cancelled', 'paused');
CREATE TYPE experience_level AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
CREATE TYPE travel_style AS ENUM ('backpacker', 'budget', 'comfort', 'luxury', 'minimalist', 'photographer', 'spiritual', 'social');
CREATE TYPE accommodation_type AS ENUM ('albergue', 'hostel', 'hotel', 'pension', 'camping', 'private');
CREATE TYPE room_type AS ENUM ('shared', 'private', 'family');
CREATE TYPE incident_type AS ENUM ('injury', 'illness', 'lost', 'theft', 'accident', 'other');
CREATE TYPE incident_severity AS ENUM ('minor', 'moderate', 'severe', 'critical');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
CREATE TYPE camino_route AS ENUM ('frances', 'portugues', 'del_norte', 'primitivo', 'ingles', 'via_plata', 'finisterre', 'muxia');

-- Create base table with common fields
CREATE TABLE base_entity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    created_by UUID,
    updated_by UUID
);

-- Create user authentication table
CREATE TABLE user_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user roles table
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_auth(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role)
);

-- Create permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role permissions table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_auth(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_auth(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key VARCHAR(255) UNIQUE NOT NULL,
    hashed_key VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pilgrim profiles table
CREATE TABLE pilgrim_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_auth(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    passport_number VARCHAR(50),
    id_card_number VARCHAR(50),
    profile_picture_url VARCHAR(500),
    bio TEXT,
    languages TEXT[] DEFAULT '{}',
    experience_level experience_level DEFAULT 'beginner',
    preferred_pace VARCHAR(20) DEFAULT 'moderate',
    motivation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_age CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '16 years')
);

-- Create emergency contacts table
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email CITEXT,
    country VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create medical information table
CREATE TABLE medical_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    blood_type blood_type,
    allergies TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    medical_conditions TEXT[] DEFAULT '{}',
    special_requirements TEXT,
    is_fit_for_hiking BOOLEAN DEFAULT TRUE,
    last_medical_check DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create previous Camino experience table
CREATE TABLE camino_experience (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    route camino_route NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_distance INTEGER NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE)),
    CONSTRAINT check_dates CHECK (end_date > start_date)
);

-- Create social profiles table
CREATE TABLE social_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    profile_picture_url VARCHAR(500),
    privacy_level VARCHAR(20) DEFAULT 'private',
    languages TEXT[] DEFAULT '{}',
    interests TEXT[] DEFAULT '{}',
    is_looking_for_companions BOOLEAN DEFAULT FALSE,
    instagram_handle VARCHAR(100),
    twitter_handle VARCHAR(100),
    facebook_profile VARCHAR(500),
    blog_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create companion preferences table
CREATE TABLE companion_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    preferred_age_min INTEGER DEFAULT 16,
    preferred_age_max INTEGER DEFAULT 80,
    preferred_experience_levels experience_level[] DEFAULT '{beginner}',
    preferred_travel_styles travel_style[] DEFAULT '{budget}',
    languages TEXT[] DEFAULT '{}',
    max_group_size INTEGER DEFAULT 6,
    same_gender_preference VARCHAR(20) DEFAULT 'no-preference',
    smoking_preference VARCHAR(20) DEFAULT 'no-preference',
    pace_preference VARCHAR(20) DEFAULT 'same',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_age_range CHECK (preferred_age_min >= 16 AND preferred_age_max <= 100 AND preferred_age_min <= preferred_age_max),
    CONSTRAINT check_group_size CHECK (max_group_size >= 1 AND max_group_size <= 20)
);

-- Create pilgrimages table
CREATE TABLE pilgrimages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    route camino_route NOT NULL,
    start_date DATE NOT NULL,
    estimated_end_date DATE NOT NULL,
    actual_end_date DATE,
    starting_point VARCHAR(100) NOT NULL,
    final_destination VARCHAR(100) NOT NULL,
    current_stage VARCHAR(100),
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    total_distance INTEGER NOT NULL,
    completed_distance INTEGER DEFAULT 0,
    daily_distance INTEGER DEFAULT 20,
    status pilgrimage_status DEFAULT 'planning',
    accommodation_preferences accommodation_type[] DEFAULT '{albergue}',
    budget_min_per_day INTEGER DEFAULT 20,
    budget_max_per_day INTEGER DEFAULT 50,
    currency VARCHAR(3) DEFAULT 'EUR',
    travel_style travel_style DEFAULT 'budget',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (estimated_end_date > start_date),
    CONSTRAINT check_distance CHECK (completed_distance >= 0 AND completed_distance <= total_distance),
    CONSTRAINT check_budget CHECK (budget_min_per_day >= 0 AND budget_max_per_day >= budget_min_per_day)
);

-- Create pilgrimage companions table
CREATE TABLE pilgrimage_companions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    contact_info VARCHAR(200) NOT NULL,
    experience_level experience_level DEFAULT 'beginner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create equipment table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    weight DECIMAL(5, 2) NOT NULL,
    is_essential BOOLEAN DEFAULT FALSE,
    is_packed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_weight CHECK (weight >= 0 AND weight <= 50)
);

-- Create itinerary stages table
CREATE TABLE itinerary_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    stage_number INTEGER NOT NULL,
    start_location VARCHAR(100) NOT NULL,
    end_location VARCHAR(100) NOT NULL,
    planned_date DATE NOT NULL,
    distance INTEGER NOT NULL,
    estimated_duration INTEGER NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'easy',
    accommodation VARCHAR(100),
    notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    actual_date DATE,
    actual_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_stage_number CHECK (stage_number > 0),
    CONSTRAINT check_distance CHECK (distance > 0 AND distance <= 100),
    CONSTRAINT check_duration CHECK (estimated_duration > 0 AND estimated_duration <= 24)
);

-- Create waypoints table
CREATE TABLE waypoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_stage_id UUID REFERENCES itinerary_stages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    altitude DECIMAL(8, 2),
    description TEXT,
    is_checkpoint BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_coordinates CHECK (latitude >= -90 AND latitude <= 90 AND longitude >= -180 AND longitude <= 180),
    CONSTRAINT check_altitude CHECK (altitude IS NULL OR (altitude >= -500 AND altitude <= 9000))
);

-- Create bookings table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrim_id UUID REFERENCES pilgrim_profiles(id) ON DELETE CASCADE,
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    accommodation_id UUID,
    accommodation_name VARCHAR(200) NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_nights INTEGER NOT NULL,
    room_type room_type NOT NULL,
    number_of_beds INTEGER NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status booking_status DEFAULT 'pending',
    payment_status payment_status DEFAULT 'pending',
    special_requests TEXT,
    confirmation_code VARCHAR(50) UNIQUE NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (check_out_date > check_in_date),
    CONSTRAINT check_nights CHECK (number_of_nights > 0),
    CONSTRAINT check_beds CHECK (number_of_beds > 0 AND number_of_beds <= 10),
    CONSTRAINT check_price CHECK (price_per_night >= 0 AND total_price >= 0)
);

-- Create cancellation policies table
CREATE TABLE cancellation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    free_cancellation_until TIMESTAMP WITH TIME ZONE,
    cancellation_fee DECIMAL(10, 2) DEFAULT 0,
    refund_percentage DECIMAL(5, 2) DEFAULT 100,
    terms TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create progress tracking table
CREATE TABLE progress_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    current_stage INTEGER DEFAULT 1,
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    total_distance_walked INTEGER DEFAULT 0,
    total_days INTEGER DEFAULT 0,
    walking_days INTEGER DEFAULT 0,
    rest_days INTEGER DEFAULT 0,
    average_daily_distance DECIMAL(5, 2) DEFAULT 0,
    max_daily_distance INTEGER DEFAULT 0,
    total_elevation_gain INTEGER DEFAULT 0,
    total_calories_burned INTEGER DEFAULT 0,
    total_steps BIGINT DEFAULT 0,
    average_speed DECIMAL(4, 2) DEFAULT 0,
    fastest_speed DECIMAL(4, 2) DEFAULT 0,
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create daily distance tracking table
CREATE TABLE daily_distances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_tracking_id UUID REFERENCES progress_tracking(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    distance INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    average_speed DECIMAL(4, 2) NOT NULL,
    steps INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    elevation_gain INTEGER DEFAULT 0,
    weather_temperature DECIMAL(5, 2),
    weather_humidity DECIMAL(5, 2),
    weather_wind_speed DECIMAL(5, 2),
    weather_precipitation DECIMAL(5, 2),
    weather_conditions VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_distance CHECK (distance >= 0 AND distance <= 100),
    CONSTRAINT check_duration CHECK (duration > 0 AND duration <= 24),
    CONSTRAINT check_speed CHECK (average_speed >= 0 AND average_speed <= 20),
    CONSTRAINT check_steps CHECK (steps >= 0 AND steps <= 100000),
    CONSTRAINT check_calories CHECK (calories_burned >= 0 AND calories_burned <= 10000)
);

-- Create achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_tracking_id UUID REFERENCES progress_tracking(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    progress DECIMAL(5, 2) DEFAULT 100,
    max_progress DECIMAL(5, 2) DEFAULT 100,
    is_completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create health and safety table
CREATE TABLE health_safety (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pilgrimage_id UUID REFERENCES pilgrimages(id) ON DELETE CASCADE,
    overall_health_score INTEGER DEFAULT 100,
    last_health_check TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create daily health checks table
CREATE TABLE daily_health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_safety_id UUID REFERENCES health_safety(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    overall_feeling VARCHAR(20) NOT NULL,
    energy_level INTEGER NOT NULL,
    pain_level INTEGER NOT NULL,
    sleep_quality VARCHAR(20) NOT NULL,
    hours_slept DECIMAL(3, 1) NOT NULL,
    hydration_level VARCHAR(20) NOT NULL,
    nutrition_quality VARCHAR(20) NOT NULL,
    notes TEXT,
    symptoms TEXT[] DEFAULT '{}',
    medications_taken TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_energy_level CHECK (energy_level >= 1 AND energy_level <= 10),
    CONSTRAINT check_pain_level CHECK (pain_level >= 0 AND pain_level <= 10),
    CONSTRAINT check_hours_slept CHECK (hours_slept >= 0 AND hours_slept <= 24)
);

-- Create incidents table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_safety_id UUID REFERENCES health_safety(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    incident_type incident_type NOT NULL,
    severity incident_severity NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    treatment TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    photos TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create emergency contacts used table
CREATE TABLE emergency_contacts_used (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_safety_id UUID REFERENCES health_safety(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES emergency_contacts(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    method VARCHAR(50) NOT NULL,
    successful BOOLEAN NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create medical attention table
CREATE TABLE medical_attention (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    health_safety_id UUID REFERENCES health_safety(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    provider VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    cost DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_auth(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    changes JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_pilgrim_profiles_email ON pilgrim_profiles(email);
CREATE INDEX idx_pilgrim_profiles_user_id ON pilgrim_profiles(user_id);
CREATE INDEX idx_pilgrim_profiles_name ON pilgrim_profiles(first_name, last_name);
CREATE INDEX idx_pilgrimages_pilgrim_id ON pilgrimages(pilgrim_id);
CREATE INDEX idx_pilgrimages_route ON pilgrimages(route);
CREATE INDEX idx_pilgrimages_status ON pilgrimages(status);
CREATE INDEX idx_pilgrimages_start_date ON pilgrimages(start_date);
CREATE INDEX idx_bookings_pilgrim_id ON bookings(pilgrim_id);
CREATE INDEX idx_bookings_pilgrimage_id ON bookings(pilgrimage_id);
CREATE INDEX idx_bookings_check_in_date ON bookings(check_in_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_progress_tracking_pilgrimage_id ON progress_tracking(pilgrimage_id);
CREATE INDEX idx_daily_distances_progress_id ON daily_distances(progress_tracking_id);
CREATE INDEX idx_daily_distances_date ON daily_distances(date);
CREATE INDEX idx_health_safety_pilgrimage_id ON health_safety(pilgrimage_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Create full-text search indexes
CREATE INDEX idx_pilgrim_profiles_search ON pilgrim_profiles USING gin(to_tsvector('english', 
    first_name || ' ' || last_name || ' ' || COALESCE(bio, '') || ' ' || COALESCE(motivation, '')
));

CREATE INDEX idx_pilgrimages_search ON pilgrimages USING gin(to_tsvector('english', 
    starting_point || ' ' || final_destination || ' ' || COALESCE(current_stage, '')
));

-- Create composite indexes for complex queries
CREATE INDEX idx_bookings_dates_status ON bookings(check_in_date, check_out_date, status);
CREATE INDEX idx_pilgrimages_dates_status ON pilgrimages(start_date, estimated_end_date, status);
CREATE INDEX idx_daily_distances_progress_date ON daily_distances(progress_tracking_id, date);
CREATE INDEX idx_incidents_health_safety_date ON incidents(health_safety_id, date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pilgrim_profiles_updated_at BEFORE UPDATE ON pilgrim_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pilgrimages_updated_at BEFORE UPDATE ON pilgrimages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_tracking_updated_at BEFORE UPDATE ON progress_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_safety_updated_at BEFORE UPDATE ON health_safety
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_auth_updated_at BEFORE UPDATE ON user_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for version increment
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version = NEW.version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_pilgrim_profiles_version BEFORE UPDATE ON pilgrim_profiles
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_pilgrimages_version BEFORE UPDATE ON pilgrimages
    FOR EACH ROW EXECUTE FUNCTION increment_version();

CREATE TRIGGER increment_bookings_version BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION increment_version();

-- Create trigger for audit logging
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, success)
        VALUES (
            current_setting('app.current_user_id', true)::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object(
                'before', to_jsonb(OLD),
                'after', to_jsonb(NEW)
            ),
            TRUE
        );
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, success)
        VALUES (
            current_setting('app.current_user_id', true)::UUID,
            'CREATE',
            TG_TABLE_NAME,
            NEW.id,
            jsonb_build_object('new', to_jsonb(NEW)),
            TRUE
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, resource, resource_id, changes, success)
        VALUES (
            current_setting('app.current_user_id', true)::UUID,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            jsonb_build_object('old', to_jsonb(OLD)),
            TRUE
        );
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER audit_pilgrim_profiles AFTER INSERT OR UPDATE OR DELETE ON pilgrim_profiles
    FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_pilgrimages AFTER INSERT OR UPDATE OR DELETE ON pilgrimages
    FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Create function for generating confirmation codes
CREATE OR REPLACE FUNCTION generate_confirmation_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Create function for calculating age
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date));
END;
$$ LANGUAGE plpgsql;

-- Create function for calculating completion percentage
CREATE OR REPLACE FUNCTION calculate_completion_percentage(completed INTEGER, total INTEGER)
RETURNS DECIMAL(5, 2) AS $$
BEGIN
    IF total = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((completed::DECIMAL / total::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function for checking booking availability
CREATE OR REPLACE FUNCTION check_booking_availability(
    p_accommodation_id UUID,
    p_check_in_date DATE,
    p_check_out_date DATE,
    p_room_type room_type,
    p_number_of_beds INTEGER
)
RETURNS TABLE (
    available BOOLEAN,
    available_rooms INTEGER,
    alternative_rooms JSONB,
    total_price DECIMAL(10, 2)
) AS $$
BEGIN
    -- This is a simplified version - in a real system, you'd check against actual room inventory
    RETURN QUERY
    SELECT 
        TRUE as available,
        5 as available_rooms,
        '[
            {"room_type": "shared", "available": true, "price": 15.00},
            {"room_type": "private", "available": true, "price": 35.00}
        ]'::JSONB as alternative_rooms,
        CASE 
            WHEN p_room_type = 'shared' THEN 15.00 * p_number_of_beds * (p_check_out_date - p_check_in_date)
            WHEN p_room_type = 'private' THEN 35.00 * p_number_of_beds * (p_check_out_date - p_check_in_date)
            ELSE 25.00 * p_number_of_beds * (p_check_out_date - p_check_in_date)
        END as total_price;
END;
$$ LANGUAGE plpgsql;

-- Insert default permissions
INSERT INTO permissions (name, resource, action) VALUES
('profile.read', 'pilgrim_profiles', 'read'),
('profile.write', 'pilgrim_profiles', 'write'),
('profile.delete', 'pilgrim_profiles', 'delete'),
('pilgrimage.read', 'pilgrimages', 'read'),
('pilgrimage.write', 'pilgrimages', 'write'),
('pilgrimage.delete', 'pilgrimages', 'delete'),
('booking.read', 'bookings', 'read'),
('booking.write', 'bookings', 'write'),
('booking.delete', 'bookings', 'delete'),
('health.read', 'health_safety', 'read'),
('health.write', 'health_safety', 'write'),
('social.read', 'social_profiles', 'read'),
('social.write', 'social_profiles', 'write'),
('admin.all', '*', 'manage');

-- Insert default role permissions
INSERT INTO role_permissions (role, permission_id) VALUES
('pilgrim', (SELECT id FROM permissions WHERE name = 'profile.read')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'profile.write')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'pilgrimage.read')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'pilgrimage.write')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'booking.read')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'booking.write')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'health.read')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'health.write')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'social.read')),
('pilgrim', (SELECT id FROM permissions WHERE name = 'social.write')),
('admin', (SELECT id FROM permissions WHERE name = 'admin.all'));