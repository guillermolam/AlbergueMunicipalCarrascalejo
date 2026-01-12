PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS pilgrims (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  first_name_encrypted TEXT NOT NULL,
  last_name1_encrypted TEXT NOT NULL,
  last_name2_encrypted TEXT NULL,
  birth_date_encrypted TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number_encrypted TEXT NOT NULL,
  document_support TEXT NULL,
  gender TEXT NOT NULL,
  nationality TEXT NULL,
  phone_encrypted TEXT NOT NULL,
  email_encrypted TEXT NULL,
  address_country TEXT NOT NULL,
  address_street_encrypted TEXT NOT NULL,
  address_street2_encrypted TEXT NULL,
  address_city_encrypted TEXT NOT NULL,
  address_postal_code TEXT NOT NULL,
  address_province TEXT NULL,
  address_municipality_code TEXT NULL,
  id_photo_url TEXT NULL,
  language TEXT NULL,
  consent_given INTEGER NULL,
  consent_date TIMESTAMP NULL,
  data_retention_until TIMESTAMP NULL,
  last_access_date TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS beds (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  bed_number INTEGER NOT NULL,
  room_number INTEGER NOT NULL,
  room_name TEXT NOT NULL,
  room_type TEXT NULL,
  price_per_night NUMERIC(10, 2) NOT NULL,
  currency TEXT NULL,
  is_available INTEGER NULL,
  status TEXT NULL,
  reserved_until TIMESTAMP NULL,
  last_cleaned_at TIMESTAMP NULL,
  maintenance_notes TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_beds_bed_number ON beds(bed_number);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  pilgrim_id INTEGER NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  number_of_nights INTEGER NOT NULL,
  number_of_persons INTEGER NULL,
  number_of_rooms INTEGER NULL,
  has_internet INTEGER NULL,
  status TEXT NULL,
  bed_assignment_id INTEGER NULL,
  estimated_arrival_time TEXT NULL,
  notes TEXT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  reservation_expires_at TIMESTAMP NOT NULL,
  payment_deadline TIMESTAMP NOT NULL,
  auto_cleanup_processed INTEGER NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_bookings_pilgrim FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id),
  CONSTRAINT fk_bookings_bed FOREIGN KEY (bed_assignment_id) REFERENCES beds(id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_reservation_expires_at ON bookings(reservation_expires_at);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  booking_id INTEGER NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_type TEXT NOT NULL,
  payment_status TEXT NULL,
  currency TEXT NULL,
  receipt_number TEXT NULL,
  payment_date TIMESTAMP NULL,
  payment_deadline TIMESTAMP NOT NULL,
  transaction_id TEXT NULL,
  gateway_response TEXT NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);

CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  room_type TEXT NOT NULL,
  bed_type TEXT NOT NULL,
  price_per_night NUMERIC(10, 2) NOT NULL,
  currency TEXT NULL,
  is_active INTEGER NULL,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_pricing_room_bed ON pricing(room_type, bed_type);

CREATE TABLE IF NOT EXISTS government_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  booking_id INTEGER NOT NULL,
  xml_content TEXT NOT NULL,
  submission_status TEXT NULL,
  response_data TEXT NULL,
  attempts INTEGER NULL,
  last_attempt TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  CONSTRAINT fk_government_submissions_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  booking_id INTEGER NULL,
  pilgrim_id INTEGER NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NULL,
  message TEXT NOT NULL,
  status TEXT NULL,
  provider_message_id TEXT NULL,
  error_message TEXT NULL,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP NULL,
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings(id),
  CONSTRAINT fk_notifications_pilgrim FOREIGN KEY (pilgrim_id) REFERENCES pilgrims(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_booking ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_pilgrim ON notifications(pilgrim_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_values TEXT NULL,
  new_values TEXT NULL,
  user_id INTEGER NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NULL,
  CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_log_record ON audit_log(table_name, record_id);

INSERT INTO users (username, password)
SELECT 'synthetic_admin', 'synthetic_password'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = 'synthetic_admin' LIMIT 1
);
