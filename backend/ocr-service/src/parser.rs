//! Parse Tesseract raw text into structured identity-document fields.
//!
//! Strategy: use regex patterns tuned for Spanish DNI / NIE / Passport layout.
//! Confidence is estimated from how many fields were successfully extracted.

use regex::Regex;

use crate::models::{DocumentType, ExtractedData};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn normalise(text: &str) -> String {
    // Collapse whitespace, uppercase for easier matching
    text.split_whitespace().collect::<Vec<_>>().join(" ").to_uppercase()
}

fn first_match(re: &Regex, text: &str) -> Option<String> {
    re.captures(text)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
}

// ── Date normalisation ────────────────────────────────────────────────────────

/// Convert various date formats → `YYYY-MM-DD`.
/// Handles: DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY, DDMMYYYY, etc.
fn normalise_date(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 8 {
        // Try DD MM YYYY first (most common on European IDs)
        let (d, m, y) = (&digits[0..2], &digits[2..4], &digits[4..8]);
        let (day, month, year): (u32, u32, u32) = (
            d.parse().ok()?,
            m.parse().ok()?,
            y.parse().ok()?,
        );
        if day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 {
            return Some(format!("{year:04}-{month:02}-{day:02}"));
        }
    }
    None
}

// ── DNI / NIE parser ──────────────────────────────────────────────────────────

fn parse_dni_nie(text: &str, doc_type: &DocumentType) -> (ExtractedData, f64) {
    let norm = normalise(text);

    // Document number — DNI: 8 digits + letter; NIE: X/Y/Z + 7 digits + letter
    let doc_re = match doc_type {
        DocumentType::Dni => Regex::new(r"\b(\d{8}[A-Z])\b").unwrap(),
        DocumentType::Nie => Regex::new(r"\b([XYZ]\d{7}[A-Z])\b").unwrap(),
        _                 => Regex::new(r"\b(\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b").unwrap(),
    };

    let document_number = first_match(&doc_re, &norm);

    // Date of birth — look for patterns like 22 03 1985 or 22/03/1985
    let dob_re = Regex::new(r"\b(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4}|\d{8})\b").unwrap();
    let date_of_birth = first_match(&dob_re, &norm).and_then(|d| normalise_date(&d));

    // Nationality — 3-letter ISO code (ESP, FRA, GBR…) or "ESPAÑOLA" etc.
    let nat_re = Regex::new(r"\b(ESP|FRA|GBR|DEU|ITA|PRT|USA|[A-Z]{3})\b").unwrap();
    let nationality = first_match(&nat_re, &norm);

    // Name extraction from DNI: line after "APELLIDOS" or "NOMBRE"
    // DNI layout (front): APELLIDOS on one line, NOMBRE on the next
    let last_re   = Regex::new(r"(?i)APELLIDOS?\s*\n?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]+)").unwrap();
    let first_re  = Regex::new(r"(?i)NOMBRE\s*\n?\s*([A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ\s]+)").unwrap();

    let raw_norm_orig = text.to_uppercase();
    let last_name  = first_match(&last_re, &raw_norm_orig).map(|s| s.trim().to_string());
    let first_name = first_match(&first_re, &raw_norm_orig).map(|s| s.trim().to_string());

    // Split compound last name: "GARCIA LOPEZ" → last="GARCIA", second="LOPEZ"
    let (last_name, second_last_name) = match last_name {
        Some(ref combined) => {
            let parts: Vec<&str> = combined.splitn(2, ' ').collect();
            (
                Some(parts[0].to_string()),
                parts.get(1).map(|s| s.to_string()),
            )
        }
        None => (None, None),
    };

    // Count filled fields for confidence estimate
    let filled = [
        document_number.is_some(),
        date_of_birth.is_some(),
        first_name.is_some(),
        last_name.is_some(),
        nationality.is_some(),
    ]
    .iter()
    .filter(|&&x| x)
    .count();

    let confidence = filled as f64 / 5.0;

    let data = ExtractedData {
        first_name,
        last_name,
        second_last_name,
        middle_name: None,
        document_number,
        document_type: Some(doc_type.as_str().to_string()),
        nationality,
        date_of_birth,
        home_address: None,
        country: None,
        has_photo: true, // DNI/NIE always has a photo
    };

    (data, confidence)
}

// ── Passport parser ───────────────────────────────────────────────────────────

fn parse_passport(text: &str) -> (ExtractedData, f64) {
    let norm = normalise(text);

    // MRZ line 1: P<ESPGARCIA<<LOPEZ<<MARIA<<<<<<<<<<<<<<<<<<<
    // MRZ line 2: AB1234567<ESP8503221M2512311<<<<<<<<<<<<<<<4
    let mrz1_re = Regex::new(r"P<([A-Z]{3})([A-Z<]+)").unwrap();
    let mrz2_re = Regex::new(r"([A-Z0-9]{9})\d([A-Z]{3})(\d{6})\d[MF](\d{6})").unwrap();

    let (mut first_name, mut last_name, mut second_last_name, mut nationality) =
        (None, None, None, None);
    let mut document_number = None;
    let mut date_of_birth   = None;

    // Parse MRZ line 1 — nationality + surname + given name
    if let Some(caps) = mrz1_re.captures(&norm) {
        nationality = Some(caps[1].to_string());
        let name_field = caps[2].replace('<', " ").trim().to_string();
        // Names are separated by double << : "GARCIA<<LOPEZ<<MARIA" → surname=GARCIA LOPEZ, given=MARIA
        let parts: Vec<&str> = name_field.splitn(3, "  ").collect(); // double-space after << replacement
        if let Some(surnames) = parts.first() {
            let sur: Vec<&str> = surnames.trim().splitn(2, ' ').collect();
            last_name        = sur.first().map(|s| s.to_string());
            second_last_name = sur.get(1).map(|s| s.to_string());
        }
        if let Some(given) = parts.get(1) {
            first_name = Some(given.trim().to_string());
        }
    }

    // Parse MRZ line 2 — document number + DOB
    if let Some(caps) = mrz2_re.captures(&norm) {
        document_number = Some(caps[1].replace('<', ""));
        if nationality.is_none() { nationality = Some(caps[2].to_string()); }
        date_of_birth   = normalise_date(&caps[3]);
    }

    // Fallback: passport number regex without full MRZ
    if document_number.is_none() {
        let pn_re = Regex::new(r"\b([A-Z]{1,2}\d{6,7})\b").unwrap();
        document_number = first_match(&pn_re, &norm);
    }

    let filled = [
        document_number.is_some(),
        date_of_birth.is_some(),
        first_name.is_some(),
        last_name.is_some(),
        nationality.is_some(),
    ]
    .iter()
    .filter(|&&x| x)
    .count();

    let confidence = filled as f64 / 5.0;

    let data = ExtractedData {
        first_name,
        last_name,
        second_last_name,
        middle_name: None,
        document_number,
        document_type: Some("PASSPORT".to_string()),
        nationality,
        date_of_birth,
        home_address: None,
        country: None,
        has_photo: true,
    };

    (data, confidence)
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Parse Tesseract raw text into structured document fields.
/// Returns `(ExtractedData, confidence 0.0–1.0)`.
pub fn parse(text: &str, doc_type: &DocumentType) -> (ExtractedData, f64) {
    match doc_type {
        DocumentType::Dni | DocumentType::Nie => parse_dni_nie(text, doc_type),
        DocumentType::Passport                => parse_passport(text),
    }
}
