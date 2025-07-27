-- Dynamic pricing table for seasonal rates and special events
-- Allows flexible pricing management for different room types

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

-- Insert default pricing
INSERT INTO pricing (room_type, effective_date, price_per_night, created_by) VALUES
    ('dorm_a', CURRENT_DATE, 15.00, 'system'),
    ('dorm_b', CURRENT_DATE, 15.00, 'system'),
    ('private', CURRENT_DATE, 35.00, 'system');

-- Insert seasonal pricing examples
INSERT INTO pricing (room_type, effective_date, price_per_night, seasonal_multiplier, special_event, created_by) VALUES
    -- Summer season (higher rates)
    ('dorm_a', '2024-06-01', 18.00, 1.2, 'Summer Season', 'system'),
    ('dorm_b', '2024-06-01', 18.00, 1.2, 'Summer Season', 'system'),
    ('private', '2024-06-01', 42.00, 1.2, 'Summer Season', 'system'),
    
    -- Holy Week (peak rates)
    ('dorm_a', '2024-03-24', 25.00, 1.67, 'Semana Santa', 'system'),
    ('dorm_b', '2024-03-24', 25.00, 1.67, 'Semana Santa', 'system'),
    ('private', '2024-03-24', 50.00, 1.43, 'Semana Santa', 'system');

-- Index for pricing lookups
CREATE INDEX idx_pricing_room_date ON pricing(room_type, effective_date);
CREATE INDEX idx_pricing_effective_date ON pricing(effective_date);