-- Pilgrim profile extracted from identity document OCR
CREATE TABLE IF NOT EXISTS pilgrim_profiles (
    id               TEXT PRIMARY KEY,          -- UUID v4
    document_type    TEXT NOT NULL,             -- 'DNI' | 'NIE' | 'PASSPORT'
    document_number  TEXT NOT NULL,
    first_name       TEXT,
    middle_name      TEXT,
    last_name        TEXT,
    second_last_name TEXT,
    nationality      TEXT,
    date_of_birth    TEXT,                      -- ISO 8601 date YYYY-MM-DD
    home_address     TEXT,
    country          TEXT,
    avatar_key       TEXT,                      -- R2 object key for avatar image
    ocr_confidence   REAL DEFAULT 0.0,
    raw_ocr_response TEXT,                      -- full JSON from Workers AI
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pilgrim_doc
    ON pilgrim_profiles (document_type, document_number);

CREATE INDEX IF NOT EXISTS idx_pilgrim_created
    ON pilgrim_profiles (created_at);

-- Trigger to keep updated_at current on every UPDATE
CREATE TRIGGER IF NOT EXISTS trg_pilgrim_updated
    AFTER UPDATE ON pilgrim_profiles
BEGIN
    UPDATE pilgrim_profiles
    SET    updated_at = datetime('now')
    WHERE  id = NEW.id;
END;
