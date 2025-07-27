-- Performance indexes for core queries
-- Optimizes booking searches, document lookups, and audit trails

-- Pilgrims indexes
CREATE INDEX idx_pilgrims_document ON pilgrims(document_type, document_number);
CREATE INDEX idx_pilgrims_email ON pilgrims(email);
CREATE INDEX idx_pilgrims_nationality ON pilgrims(nationality_code);
CREATE INDEX idx_pilgrims_validation_status ON pilgrims(validation_status);

-- Bookings indexes
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_expires_at ON bookings(expires_at) WHERE status = 'reserved';
CREATE INDEX idx_bookings_pilgrim ON bookings(pilgrim_id);
CREATE INDEX idx_bookings_bed ON bookings(bed_id);
CREATE INDEX idx_bookings_mir_status ON bookings(mir_submission_status);

-- Beds indexes
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room_type ON beds(room_type);
CREATE INDEX idx_beds_number ON beds(bed_number);

-- Payments indexes
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(payment_provider);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_booking ON notifications(booking_id);
CREATE INDEX idx_notifications_pilgrim ON notifications(pilgrim_id);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Audit log indexes
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Countries indexes
CREATE INDEX idx_countries_code ON countries(code);
CREATE INDEX idx_countries_name ON countries(name);