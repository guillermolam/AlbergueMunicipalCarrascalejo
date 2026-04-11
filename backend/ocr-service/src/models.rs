use serde::{Deserialize, Serialize};

// ── Document type ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DocumentType {
    Dni,
    Nie,
    Passport,
}

impl DocumentType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "DNI"                              => Some(Self::Dni),
            "NIE"                              => Some(Self::Nie),
            "PASSPORT" | "PAS" | "PASAPORTE"  => Some(Self::Passport),
            _                                  => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Dni      => "DNI",
            Self::Nie      => "NIE",
            Self::Passport => "PASSPORT",
        }
    }
}

// ── Extracted pilgrim data ────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedData {
    pub first_name:       Option<String>,
    pub middle_name:      Option<String>,
    pub last_name:        Option<String>,
    pub second_last_name: Option<String>,
    pub document_number:  Option<String>,
    pub document_type:    Option<String>,
    pub nationality:      Option<String>,
    pub date_of_birth:    Option<String>,   // YYYY-MM-DD
    pub home_address:     Option<String>,
    pub country:          Option<String>,
    pub has_photo:        bool,
}

// ── OCR HTTP response (matches the shape book.astro expects) ─────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OcrResponse {
    pub success:        bool,
    pub profile_id:     String,
    pub document_type:  String,
    pub extracted_data: ExtractedData,
    pub confidence:     f64,
    pub avatar_url:     Option<String>,
    pub warnings:       Vec<String>,
    /// Raw Tesseract output — useful for debugging
    pub raw_text:       Option<String>,
}
