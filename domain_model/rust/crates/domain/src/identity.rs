use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PilgrimId(pub i32);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressCountry(pub String);

// ── Structured profile types ──────────────────────────────────────────────────
// Mirror the Clerk metadata shapes used by the frontend (profile store, profile
// island). Stored as encrypted JSON text in the DB (AES-256-GCM by app layer).

/// Structured phone number — matches Clerk metadata format.
///
/// Stored as `phone_encrypted` (encrypted JSON) in the `pilgrims` table.
/// `code` and `country` are also mirrored as plaintext `phone_code` /
/// `phone_country` columns for querying without decryption.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PhoneNumber {
    /// E.164 dialing prefix, e.g. `"+34"`
    pub code: String,
    /// Local number without country code, e.g. `"620235950"`
    pub number: String,
    /// ISO 3166-1 alpha-2 country code, e.g. `"ES"`
    pub country: String,
}

/// One address line pair.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressStreet {
    pub line1: Option<String>,
    pub line2: Option<String>,
}

/// Structured postal address — matches Clerk metadata format.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct StructuredAddress {
    pub street: Option<AddressStreet>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postal_code: Option<String>,
    /// ISO 3166-1 alpha-2
    pub country: Option<String>,
}

/// A scanned image reference for a pilgrim document.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct DocumentImage {
    pub label: Option<String>,
    pub r2_url: Option<String>,
    pub cloudflare_image_id: Option<String>,
}

/// One identity document (passport, DNI, NIE, etc.) with optional scan images.
///
/// Stored as part of `documents_encrypted` (encrypted JSON array) in `pilgrims`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PilgrimDocument {
    /// Client-generated UUID
    pub id: String,
    /// `"dni"` | `"nie"` | `"passport"` | `"driving_license"` | free text
    pub document_type: String,
    /// ISO 3166-1 alpha-2 issuing country
    pub country: Option<String>,
    /// ISO 8601 date string `YYYY-MM-DD`
    pub expiration_date: Option<String>,
    pub images: Option<Vec<DocumentImage>>,
}

/// One emergency contact entry.
///
/// Stored as part of `emergency_contacts_encrypted` (encrypted JSON array) in `pilgrims`.
/// Relation uses English keys: `"father"` | `"mother"` | `"partner"` | `"child"`
/// | `"sibling"` | `"friend"` | `"colleague"` | `"other"`.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct EmergencyContactEntry {
    pub name: Option<String>,
    pub relation: Option<String>,
    pub phone: Option<PhoneNumber>,
    pub email: Option<String>,
}
