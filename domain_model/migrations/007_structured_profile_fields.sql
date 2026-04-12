-- ============================================================================
-- Migration 007: Structured profile fields
--
-- Adds support for the actual Clerk metadata data shapes:
--   - Structured phone number { code, number, country }
--   - Emergency contacts as JSON array (multiple contacts, structured phone)
--   - Identity documents as JSON array (with images)
--   - Address line 2
--
-- All new columns store encrypted data (AES-256-GCM, consistent with existing
-- pilgrims PII columns). Non-PII metadata columns (phone_code, phone_country)
-- are stored in plaintext.
--
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).
-- Run AFTER migration 006.
-- ============================================================================

BEGIN;

-- ── pilgrims: structured phone metadata (not PII) ────────────────────────────

ALTER TABLE pilgrims
  ADD COLUMN IF NOT EXISTS phone_code    TEXT,   -- dialing code e.g. "+34"
  ADD COLUMN IF NOT EXISTS phone_country TEXT;   -- ISO 3166-1 alpha-2 e.g. "ES"

COMMENT ON COLUMN pilgrims.phone_code    IS 'E.164 dialing prefix ("+34") — not PII, no encryption needed';
COMMENT ON COLUMN pilgrims.phone_country IS 'ISO 3166-1 alpha-2 phone country code — not PII';

-- ── pilgrims: emergency contacts array (encrypted JSON) ──────────────────────
--
-- Stores EmergencyContactEntry[] as AES-256-GCM encrypted JSON:
--   [{ name, relation, phone: { code, number, country }, email }]
--
-- The existing flat columns (emergency_contact_name_encrypted,
-- emergency_contact_phone_encrypted) are kept for backward compat and for
-- government submissions that require individual flat fields.

ALTER TABLE pilgrims
  ADD COLUMN IF NOT EXISTS emergency_contacts_encrypted TEXT;

COMMENT ON COLUMN pilgrims.emergency_contacts_encrypted IS
  'AES-256-GCM encrypted JSON: EmergencyContactEntry[] with structured phone. '
  'Supersedes emergency_contact_name_encrypted for multi-contact support.';

-- ── pilgrims: identity documents array (encrypted JSON) ──────────────────────
--
-- Stores PilgrimDocument[] as AES-256-GCM encrypted JSON:
--   [{ id, type, country, expirationDate, images: [{ label, r2Url, cloudflareImageId }] }]

ALTER TABLE pilgrims
  ADD COLUMN IF NOT EXISTS documents_encrypted TEXT;

COMMENT ON COLUMN pilgrims.documents_encrypted IS
  'AES-256-GCM encrypted JSON: PilgrimDocument[] with scan image references. '
  'Complements id_document_scan_url / passport_scan_url for multi-document support.';

-- ── pilgrims: address line 2 (encrypted) ─────────────────────────────────────

ALTER TABLE pilgrims
  ADD COLUMN IF NOT EXISTS address_line2_encrypted TEXT;

COMMENT ON COLUMN pilgrims.address_line2_encrypted IS
  'AES-256-GCM encrypted second address line (apartment, floor, etc.)';

-- ── Verify new columns exist ──────────────────────────────────────────────────

DO $$
DECLARE
  expected_cols TEXT[] := ARRAY[
    'phone_code', 'phone_country',
    'emergency_contacts_encrypted', 'documents_encrypted', 'address_line2_encrypted'
  ];
  col TEXT;
  col_exists BOOLEAN;
BEGIN
  FOREACH col IN ARRAY expected_cols LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'pilgrims' AND column_name = col
    ) INTO col_exists;
    IF NOT col_exists THEN
      RAISE EXCEPTION 'Migration 007 failed: column % not found on pilgrims table', col;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migration 007: all expected columns verified on pilgrims table.';
END $$;

COMMIT;
