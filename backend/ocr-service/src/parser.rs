//! Parse Tesseract raw text into structured identity-document fields.
//!
//! Architecture:
//!   - `detect_document_type(text)` → inspects raw OCR output for document clues
//!   - `parse_dni(text)`            → Spanish DNI (all regional / bilingual variants)
//!   - `parse_nie(text)`            → Spanish NIE / Permiso de Residencia
//!   - `parse_passport(text)`       → ICAO TD3 passports (MRZ + visual fields)
//!   - `parse(text, doc_type)`      → public dispatch entry point

use regex::Regex;

use crate::models::{DocumentType, ExtractedData};

// ── Shared helpers ────────────────────────────────────────────────────────────

fn normalise(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_uppercase()
}

fn first_match(re: &Regex, text: &str) -> Option<String> {
    re.captures(text)
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().trim().to_string())
}

/// Convert `DD MM YYYY`, `DD/MM/YYYY`, `DDMMYYYY`, `DD.MM.YYYY` → `YYYY-MM-DD`.
fn normalise_date(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 8 {
        let (d, m, y) = (&digits[0..2], &digits[2..4], &digits[4..8]);
        let (day, month, year): (u32, u32, u32) =
            (d.parse().ok()?, m.parse().ok()?, y.parse().ok()?);
        if (1..=31).contains(&day) && (1..=12).contains(&month) && year >= 1900 {
            return Some(format!("{year:04}-{month:02}-{day:02}"));
        }
    }
    None
}

/// Convert `DD MON YYYY` (e.g. `07 JUN 1984`, `10.05.1986`) → `YYYY-MM-DD`.
/// Also handles numeric forms by delegating to `normalise_date`.
fn normalise_passport_date(raw: &str) -> Option<String> {
    // Try numeric first
    if let Some(d) = normalise_date(raw) {
        return Some(d);
    }
    // Try DD MON YYYY where MON is a 3-letter month abbreviation
    let re = Regex::new(
        r"(?i)(\d{1,2})[\s./\-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|\
ENE|ABR|AGO|DIC)\s*(\d{4})",
    )
    .unwrap();
    let cap = re.captures(raw)?;
    let day: u32 = cap[1].parse().ok()?;
    let month: u32 = match cap[2].to_uppercase().as_str() {
        "JAN" | "ENE" => 1,
        "FEB" => 2,
        "MAR" => 3,
        "APR" | "ABR" => 4,
        "MAY" => 5,
        "JUN" => 6,
        "JUL" => 7,
        "AUG" | "AGO" => 8,
        "SEP" => 9,
        "OCT" => 10,
        "NOV" => 11,
        "DEC" | "DIC" => 12,
        _ => return None,
    };
    let year: u32 = cap[3].parse().ok()?;
    if (1..=31).contains(&day) && year >= 1900 {
        Some(format!("{year:04}-{month:02}-{day:02}"))
    } else {
        None
    }
}

// ── Document type detection ───────────────────────────────────────────────────
//
// Called when the caller passes `DocumentType::Dni` as a hint OR explicitly
// asks for auto-detection.  Returns the best guess from the raw OCR text.

pub fn detect_document_type(text: &str) -> Option<DocumentType> {
    let up = text.to_uppercase();

    // Passport: MRZ line 1 starts with "P<" (ICAO TD3) — at least 10 chars after P<
    if Regex::new(r"P<[A-Z]{3}[A-Z<]{7,}").unwrap().is_match(&up) {
        return Some(DocumentType::Passport);
    }
    // Passport: visual keywords
    if up.contains("PASSPORT")
        || up.contains("PASAPORTE")
        || up.contains("PUTOVNICA")
        || up.contains("PASSEPORT")
        || up.contains("REISEPASS")
    {
        return Some(DocumentType::Passport);
    }

    // NIE / Permiso de Residencia
    if up.contains("PERMISO DE RESIDENCIA")
        || up.contains("EXTRANJERO")
        || Regex::new(r"\b[XYZ]\d{7}[A-Z]\b").unwrap().is_match(&up)
    {
        return Some(DocumentType::Nie);
    }

    // DNI
    if up.contains("DOCUMENTO NACIONAL DE IDENTIDAD")
        || up.contains("MINISTERIO DEL INTERIOR")
        || Regex::new(r"\bDNI\b").unwrap().is_match(&up)
        || Regex::new(r"\b\d{8}[A-Z]\b").unwrap().is_match(&up)
    {
        return Some(DocumentType::Dni);
    }

    None
}

// ── DNI parser ────────────────────────────────────────────────────────────────
//
// Supports all regional / bilingual label variants:
//   Plain older:    APELLIDOS / NOMBRE / SEXO / FECHA DE NACIMIENTO / NACIONALIDAD
//   Basque newer:   APELLIDOS/ABIZENAK  NOMBRE/IZENA  SEXO/SEXUA  NACIMIENTO/JAIOTEGUNA
//   Catalan/Val:    APELLIDOS/COGNOMS   NOMBRE/NOM    SEXO/SEXE   DATA DE NAIXEMENT
//
// Key layout notes:
//   - Older: each surname on its own line after APELLIDOS label
//   - Catalan regional: both surnames on ONE line after APELLIDOS/COGNOMS
//   - Newer bilingual: SEXO / NACIMIENTO / NACIONALIDAD values all on ONE data row
//   - Validity date (VALIDEZ) must not be confused with DOB

fn parse_dni(text: &str) -> (ExtractedData, f64) {
    let upper = text.to_uppercase();
    let norm = normalise(text);

    // ── Document number ───────────────────────────────────────────────────────
    let document_number = {
        // Explicit "DNI XXXXXXXX" prefix (most reliable)
        let prefix_re = Regex::new(r"(?:DNI|D\.N\.I\.?)\s*(\d{7,8}[A-Z])").unwrap();
        // Bare pattern fallback
        let bare_re = Regex::new(r"\b(\d{8}[A-Z])\b").unwrap();
        first_match(&prefix_re, &upper).or_else(|| first_match(&bare_re, &upper))
    };

    // ── Date of birth ─────────────────────────────────────────────────────────
    // Older: "FECHA DE NACIMIENTO\n05 03 1968"  (next-line)
    // Newer: "NACIMIENTO / JAIOTEGUNA  15 04 1995"  (same-line bilingual)
    let date_of_birth = {
        // Same-line: keyword then lazy-match to first date on same line.
        // Also works on NORMALISED text where SEXO/NACIONALIDAD/NACIMIENTO header
        // and M/ESP/DOB data row are collapsed into one line:
        //   raw:  "SEXO    NACIONALIDAD    NACIMIENTO\nM       ESP             14 02 2006"
        //   norm: "SEXO NACIONALIDAD NACIMIENTO M ESP 14 02 2006"
        let same_re = Regex::new(
            r"(?i)(?:NACIMIENTO|BIRTH\s+DATE|FECHA\s+NAC)[^\r\n]*?(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4}|\d{8})"
        ).unwrap();
        // Next-line: keyword, rest-of-line, newline, then date (older layout)
        let next_re = Regex::new(
            r"(?i)NACIMIENTO[^\r\n]*[\r\n]+\s*(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4}|\d{8})",
        )
        .unwrap();

        let anchored = first_match(&same_re, &upper)
            .and_then(|d| normalise_date(&d))
            // Try normalised text: NACIMIENTO … M … ESP … 14 02 2006 (all on one "line")
            .or_else(|| first_match(&same_re, &norm).and_then(|d| normalise_date(&d)))
            .or_else(|| first_match(&next_re, &upper).and_then(|d| normalise_date(&d)));

        anchored.or_else(|| {
            // Fallback: scan dates in normalized text BEFORE EMISION/VALIDEZ keywords
            // to avoid picking up the issue or expiry date as DOB.
            let emit_pos = norm.find("EMISION").unwrap_or(usize::MAX);
            let valid_pos = norm.find("VALIDEZ").unwrap_or(usize::MAX);
            let end_pos = emit_pos.min(valid_pos).min(norm.len());

            // Search between NACIMIENTO and the first EMISION/VALIDEZ keyword
            let nac_pos = norm.find("NACIMIENTO").unwrap_or(0);
            let search = &norm[nac_pos..end_pos];

            let any_re = Regex::new(r"\b(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4})\b").unwrap();
            for cap in any_re.captures_iter(search) {
                let raw = cap.get(1).map_or("", |m| m.as_str());
                if let Some(iso) = normalise_date(raw) {
                    let year: u32 = iso[..4].parse().unwrap_or(0);
                    if year <= 2025 {
                        return Some(iso);
                    }
                }
            }
            // Last resort: first date anywhere with year ≤ 2025
            for cap in any_re.captures_iter(&norm) {
                let raw = cap.get(1).map_or("", |m| m.as_str());
                if let Some(iso) = normalise_date(raw) {
                    let year: u32 = iso[..4].parse().unwrap_or(0);
                    if year <= 2025 {
                        return Some(iso);
                    }
                }
            }
            None
        })
    };

    // ── Surnames (APELLIDOS) ──────────────────────────────────────────────────
    let (last_name, second_last_name) = extract_dni_surnames(&upper);

    // ── First name (NOMBRE) ───────────────────────────────────────────────────
    let first_name = extract_dni_nombre(&upper, &norm);

    // ── Gender + Nationality (combined extraction) ────────────────────────────
    let (gender, nationality) = extract_sex_nationality(&upper);

    // ── Expiry date (VALIDEZ) ─────────────────────────────────────────────────
    let expiry_date = extract_validez(&upper);

    // ── Home address (DOMICILIO) — present on back side ───────────────────────
    let home_address = extract_home_address(text);

    // ── TD1 MRZ fallback (DNI back side) ─────────────────────────────────────
    // If label-based parsing found nothing useful, try TD1 MRZ extraction.
    // The MRZ on the DNI back card (3 × 30 chars, ICAO TD1) is highly structured
    // and more reliable than label parsing when the front-side image is blurry.
    let label_confidence = [
        document_number.is_some(),
        date_of_birth.is_some(),
        last_name.is_some(),
    ]
    .iter()
    .filter(|&&x| x)
    .count();

    if label_confidence < 2 {
        if let Some(mrz) = parse_mrz_td1(text) {
            // Merge: use MRZ value where label parsing failed
            return build_result(
                document_number.or(mrz.document_number),
                date_of_birth.or(mrz.date_of_birth),
                expiry_date.or(mrz.expiry_date),
                first_name.or(mrz.first_name),
                last_name.or(mrz.last_name),
                second_last_name.or(mrz.second_last_name),
                nationality.or(mrz.nationality),
                gender.or(mrz.gender),
                home_address.or(mrz.home_address),
                "DNI",
            );
        }
    }

    build_result(
        document_number,
        date_of_birth,
        expiry_date,
        first_name,
        last_name,
        second_last_name,
        nationality,
        gender,
        home_address,
        "DNI",
    )
}

// ── NIE / Permiso de Residencia parser ───────────────────────────────────────
//
// Key differences from DNI:
//   - Combined "APELLIDOS Nombres / SURNAMES Forenames" label covers ap1+ap2+firstname
//   - NIE personal number lives in OBSERVACIONES: "NIE: X1234567P"
//   - Card number (E00000000) is different from the NIE personal number
//   - "SEXO/SEX F  NACIONALIDAD/NATIONALITY ARG  FECHA NAC./BIRTH DATE 01 01 1980"
//     — all three values on ONE data row
//   - NIE names can be mixed case (newer cards): "Carmen", "Maria Inmaculada"

fn parse_nie(text: &str) -> (ExtractedData, f64) {
    let upper = text.to_uppercase();
    let norm = normalise(text);

    // ── NIE personal number from OBSERVACIONES ────────────────────────────────
    let document_number = {
        let obs_re = Regex::new(r"(?i)NIE[:\s]+([XYZ]\d{7}[A-Z])").unwrap();
        let prefix_re = Regex::new(r"(?:NIE|N\.I\.E\.?)\s*([XYZ]\d{7}[A-Z])").unwrap();
        let bare_re = Regex::new(r"\b([XYZ]\d{7}[A-Z])\b").unwrap();
        first_match(&obs_re, &upper)
            .or_else(|| first_match(&prefix_re, &upper))
            .or_else(|| first_match(&bare_re, &upper))
    };

    // ── Date of birth ─────────────────────────────────────────────────────────
    // "FECHA NAC./BIRTH DATE 01 01 1980"  (same-line)
    let date_of_birth = {
        let same_re = Regex::new(
            r"(?i)(?:FECHA\s+NAC|BIRTH\s+DATE|NACIMIENTO)[^\r\n]*?(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4}|\d{8})"
        ).unwrap();
        first_match(&same_re, &upper)
            .and_then(|d| normalise_date(&d))
            .or_else(|| {
                let any_re = Regex::new(r"\b(\d{1,2}[\s/\-\.]\d{1,2}[\s/\-\.]\d{4})\b").unwrap();
                for cap in any_re.captures_iter(&norm) {
                    let raw = cap.get(1).map_or("", |m| m.as_str());
                    if let Some(iso) = normalise_date(raw) {
                        let year: u32 = iso[..4].parse().unwrap_or(0);
                        if year <= 2025 {
                            return Some(iso);
                        }
                    }
                }
                None
            })
    };

    // ── Gender + Nationality (combined extraction) ────────────────────────────
    let (gender, nationality) = extract_sex_nationality(&upper);

    // ── Expiry date (VALIDEZ TARJETA) ─────────────────────────────────────────
    let expiry_date = extract_validez(&upper);

    // ── Names — use mixed-case-aware NIE extractor ────────────────────────────
    // Works on original text (not uppercased) to preserve mixed-case given names.
    let (last_name, second_last_name, nie_fn) = extract_nie_names(text);
    let first_name = nie_fn.or_else(|| extract_dni_nombre(&upper, &norm));

    build_result(
        document_number,
        date_of_birth,
        expiry_date,
        first_name,
        last_name,
        second_last_name,
        nationality,
        gender,
        None,
        "NIE",
    )
}

// ── Passport parser ───────────────────────────────────────────────────────────
//
// Passports follow ICAO TD3 standard (ICAO Doc 9303 Part 4):
//
//   MRZ Line 1 — 44 chars:
//     [0]      Document type  (P)
//     [1]      Subtype or <
//     [2..5]   Issuing state  (3 alpha)
//     [5..44]  Names: SURNAME<<GIVEN<NAMES<<<...  (39 chars, << separates surname/given)
//
//   MRZ Line 2 — 44 chars:
//     [0..9]   Document number (9 alphanum)
//     [9]      Check digit (doc number)
//     [10..13] Nationality (3 alpha)
//     [13..19] Date of birth YYMMDD (6 digits)
//     [19]     Check digit (DOB)
//     [20]     Sex  M / F / <
//     [21..27] Expiry date YYMMDD (6 digits)
//     [27]     Check digit (expiry)
//     [28..42] Personal number (14 chars)
//     [42]     Check digit (personal number)
//     [43]     Composite check digit
//
// Tutorial insight (ilhan.negis): routing by total MRZ char count is the most
// reliable format discriminator: TD1=90, TD2=72, TD3=88 (after stripping spaces).
// Always apply OCR character corrections (O→0, I→1, etc.) to numeric MRZ fields
// BEFORE position-based slicing, not after.
//
// Visual field parsing is used as fallback for partially-degraded MRZ.
// Visual DOB variants: "07 JUN 1984", "10.05.1986", "25.12.1982", etc.

fn parse_passport(text: &str) -> (ExtractedData, f64) {
    let norm = normalise(text);
    let upper = text.to_uppercase();

    let (mut first_name, mut last_name, mut second_last_name) = (None, None, None);
    let mut nationality = None;
    let mut document_number = None;
    let mut date_of_birth = None;
    let mut gender = None;
    let mut expiry_date = None;

    // ── Primary: structured TD3 MRZ parser (exact position slicing) ──────────
    if let Some(mrz) = parse_mrz_td3(text) {
        first_name = mrz.first_name;
        last_name = mrz.last_name;
        second_last_name = mrz.second_last_name;
        nationality = mrz.nationality;
        document_number = mrz.document_number;
        date_of_birth = mrz.date_of_birth;
        gender = mrz.gender;
        expiry_date = mrz.expiry_date;
    } else {
        // ── Regex fallback for partial / fragmented MRZ ───────────────────────
        // Handles cases where OCR gives a single combined line instead of two
        // clean 44-char lines (e.g. after Tesseract page-segmentation errors).

        // Line 1: P<{NAT}{SURNAME}<<{GIVEN}...
        let mrz1_re = Regex::new(r"P<([A-Z]{3})([A-Z<]{5,})").unwrap();
        // Line 2: apply corrections then match by field structure
        // Using loose match: doc_num(9) + any-check(1) + nat(3) + DOB(6) + any-check(1) + sex + expiry(6)
        let mrz2_re =
            Regex::new(r"([A-Z0-9<]{9})[0-9A-Z]([A-Z]{3})(\d{6})[0-9]([MF<])(\d{6})").unwrap();

        if let Some(caps) = mrz1_re.captures(&norm) {
            nationality = Some(correct_mrz_alpha(&caps[1]));
            // Split names on "<<" (double filler = surname↔given separator)
            let name_raw = &caps[2];
            if let Some(sep) = name_raw.find("<<") {
                let surnames_raw = &name_raw[..sep];
                let given_raw = name_raw[sep + 2..].trim_matches('<');
                let sur_parts: Vec<&str> =
                    surnames_raw.split('<').filter(|s| !s.is_empty()).collect();
                last_name = sur_parts
                    .first()
                    .map(|s| correct_mrz_alpha(s))
                    .filter(|s| !s.is_empty());
                second_last_name = if sur_parts.len() > 1 {
                    Some(correct_mrz_alpha(&sur_parts[1..].join(" ")))
                } else {
                    None
                };
                let given = given_raw.replace('<', " ").trim().to_string();
                if !given.is_empty() {
                    first_name = Some(given);
                }
            } else {
                // No double separator — everything is surname
                let all = name_raw.replace('<', " ").trim().to_string();
                if !all.is_empty() {
                    last_name = Some(all);
                }
            }
        }

        // Apply numeric corrections to the whole norm before line-2 matching
        let norm_corrected = correct_mrz_numeric(&norm);
        if let Some(caps) = mrz2_re.captures(&norm_corrected) {
            let raw_num = caps[1].replace('<', "");
            if !raw_num.is_empty() {
                document_number = Some(raw_num);
            }
            if nationality.is_none() {
                nationality = Some(correct_mrz_alpha(&caps[2]));
            }
            date_of_birth = normalise_mrz_date(&caps[3]);
            let sex = caps[4].trim().to_string();
            if sex == "M" || sex == "F" {
                gender = Some(sex);
            }
            expiry_date = normalise_mrz_date(&caps[5]);
        }
    }

    // ── Visual field fallbacks ────────────────────────────────────────────────
    // Used when MRZ is absent or incomplete (e.g. only front page scanned without MRZ).

    if document_number.is_none() {
        let pn_re = Regex::new(r"\b([A-Z]{1,2}\d{6,9})\b").unwrap();
        document_number = first_match(&pn_re, &norm);
    }

    if nationality.is_none() {
        let nat_re = Regex::new(
            r"(?i)(?:Nationality|Nationalit[eé]|Staatsangeh)[^\n:]*[:\s]+([A-Z][A-Za-z]{1,20})",
        )
        .unwrap();
        nationality = first_match(&nat_re, &upper).or_else(|| {
            let known = Regex::new(
                r"\b(ESP|FRA|GBR|DEU|AUS|USA|ITA|PRT|HRV|LVA|LUX|BEL|NLD|CHE|AUT|NOR|DNK|FIN|SWE|POL|GRC|IRL|MAR|ARG|BRA|MEX|CHN|JPN|KOR)\b"
            ).unwrap();
            first_match(&known, &norm)
        });
    }

    if date_of_birth.is_none() {
        let dob_re = Regex::new(
            r"(?i)(?:Date\s+of\s+birth|Date\s+de\s+naissance|Fecha\s+de\s+nacimiento|Datum\s+ro[dđ]enja|Gebuert)[^\n]*?(\d{1,2}[\s./\-](?:\w+)[\s./\-]\d{4}|\d{1,2}[\s./\-]\d{1,2}[\s./\-]\d{4})"
        ).unwrap();
        date_of_birth = first_match(&dob_re, &upper).and_then(|d| normalise_passport_date(&d));
    }

    if gender.is_none() {
        let sex_re = Regex::new(r"(?i)(?:Sex|Sexe|Sexo)[^\n:]*[:\s]+([MF])\b").unwrap();
        gender = first_match(&sex_re, &upper);
    }

    if last_name.is_none() {
        let sur_re = Regex::new(
            r"(?i)(?:Surname|Nom|Nachname|Prezime|Nom\/Nom)[^\n:]*[:\s]+([A-Z][A-Za-z\u00C0-\u024F\s]+)"
        ).unwrap();
        last_name = first_match(&sur_re, &upper).map(|s| s.trim().to_string());
    }
    if first_name.is_none() {
        let gn_re = Regex::new(
            r"(?i)(?:Given\s+names?|Pr[eé]noms?|Vorname|Ime|Voornamen)[^\n:]*[:\s]+([A-Z][A-Za-z\u00C0-\u024F\s]+)"
        ).unwrap();
        first_name = first_match(&gn_re, &upper).map(|s| s.trim().to_string());
    }

    build_result(
        document_number,
        date_of_birth,
        expiry_date,
        first_name,
        last_name,
        second_last_name,
        nationality,
        gender,
        None,
        "PASSPORT",
    )
}

// ── TD3 MRZ parser (ICAO passport — 2 × 44 chars) ────────────────────────────
//
// Tutorial-informed approach (ilhan.negis / Medium):
//   1. Detect MRZ lines by: len ≥ 40, all uppercase/digit/<, first starts with P
//   2. Apply OCR character corrections PER FIELD TYPE (numeric vs alpha) BEFORE slicing
//   3. Use EXACT byte positions (not regex) for all TD3 line-2 fields
//   4. Validate every check digit; reject a field if its check fails badly
//
// Character confusion table (from article):
//   Numeric fields: O→0, I→1, S→5, B→8, G→6, Q→0, Z→2
//   Alpha fields:   0→O, 1→I
//   Filler:         K or X sometimes misread as <

fn parse_mrz_td3(text: &str) -> Option<ExtractedData> {
    // Collect MRZ candidate lines: strip spaces, keep only [A-Z0-9<] lines ≥ 40 chars
    let candidates: Vec<String> = text
        .lines()
        .map(|l| l.trim().replace(' ', ""))
        .filter(|l| {
            l.len() >= 40
                && l.chars()
                    .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '<')
        })
        .collect();

    // Find two consecutive lines where line1 starts with P (passport type)
    let mut mrz_line1: Option<String> = None;
    let mut mrz_line2: Option<String> = None;

    for i in 0..candidates.len().saturating_sub(1) {
        let l1 = &candidates[i];
        let l2 = &candidates[i + 1];
        // TD3 identification (ICAO Doc 9303):
        //   Line 1 always starts with P followed by sub-type or filler < then 3-letter country
        //   Line 2 does NOT start with P< (the << signature of another name-line)
        let l1_is_td3 = l1.starts_with("P<")
            && l1.len() >= 40
            && l1.chars().skip(2).take(3).all(|c| c.is_ascii_uppercase());
        let l2_is_not_name_line = !l2.starts_with("P<");
        if l1_is_td3 && l2_is_not_name_line && l2.len() >= 40 {
            mrz_line1 = Some(format!("{:<44}", l1));
            mrz_line2 = Some(format!("{:<44}", l2));
            break;
        }
    }

    let l1 = mrz_line1?;
    let l2 = mrz_line2?;

    // ── Parse Line 1: issuing state + names ──────────────────────────────────
    // [0]: P, [1]: subtype or <, [2..5]: issuing state, [5..44]: name field
    let issuing_state = l1.get(2..5).map(correct_mrz_alpha).unwrap_or_default();

    let name_field = l1.get(5..44).unwrap_or("");
    let (last_name, second_last_name, first_name) = parse_mrz_names(name_field);

    // ── Parse Line 2: exact position slicing ─────────────────────────────────
    // Apply numeric corrections ONLY to the purely-numeric fields (by position),
    // and alpha correction to purely-alpha fields.  This avoids corrupting the
    // check-digit characters which are always decimal digits 0-9.

    // Pad to 44 to avoid panics on short lines
    let l2 = format!("{:<44}", l2);

    // Doc number [0..9] — mixed alphanum (may contain letters like passport number AA123456)
    // Apply selective correction: only pure-digit-expected positions get numeric fix
    let doc_num_raw = l2.get(0..9).map(correct_mrz_numeric).unwrap_or_default();
    let doc_check_ch = l2.chars().nth(9).unwrap_or('0');
    let doc_check = doc_check_ch.to_digit(10).unwrap_or(99);

    // Nationality [10..13] — 3 alpha chars
    let nat_raw = l2.get(10..13).map(correct_mrz_alpha).unwrap_or_default();

    // DOB [13..19] — 6 digits YYMMDD
    let dob_raw = l2.get(13..19).map(correct_mrz_numeric).unwrap_or_default();
    let dob_check = l2
        .chars()
        .nth(19)
        .and_then(|c| c.to_digit(10))
        .unwrap_or(99);

    // Sex [20] — M / F / <
    let sex_char = l2.chars().nth(20).unwrap_or('<');

    // Expiry [21..27] — 6 digits YYMMDD
    let expiry_raw = l2.get(21..27).map(correct_mrz_numeric).unwrap_or_default();
    let expiry_check = l2
        .chars()
        .nth(27)
        .and_then(|c| c.to_digit(10))
        .unwrap_or(99);

    // ── Check digit validation ────────────────────────────────────────────────
    // Validate each field; if check fails use field anyway (OCR may have garbled
    // the check digit itself) but note it in a soft way.
    let doc_check_ok = calculate_check_digit(&doc_num_raw) == doc_check;
    let dob_check_ok = calculate_check_digit(&dob_raw) == dob_check;
    let expiry_check_ok = calculate_check_digit(&expiry_raw) == expiry_check;

    // If ALL three checks fail, the line is probably not real MRZ — bail
    if !doc_check_ok && !dob_check_ok && !expiry_check_ok {
        return None;
    }

    // ── Build fields ──────────────────────────────────────────────────────────
    let document_number = {
        let clean = doc_num_raw.trim_matches('<').to_string();
        if clean.is_empty() {
            None
        } else {
            Some(clean)
        }
    };

    let nationality = {
        let clean = nat_raw.replace('<', "");
        if clean.len() >= 2 {
            Some(clean)
        } else if issuing_state.len() == 3 {
            Some(issuing_state.clone())
        } else {
            None
        }
    };

    let date_of_birth = if dob_check_ok || dob_raw.chars().all(|c| c.is_ascii_digit()) {
        normalise_mrz_date(&dob_raw)
    } else {
        None
    };

    let expiry_date = if expiry_check_ok || expiry_raw.chars().all(|c| c.is_ascii_digit()) {
        normalise_mrz_date(&expiry_raw)
    } else {
        None
    };

    let gender = match sex_char {
        'M' => Some("M".to_string()),
        'F' => Some("F".to_string()),
        'X' => Some("X".to_string()),
        _ => None,
    };

    let has_data = document_number.is_some() || date_of_birth.is_some() || last_name.is_some();
    if !has_data {
        return None;
    }

    // Store the ISSUING country from MRZ line 1 (positions 2-4).
    // This is separate from `nationality` (from line 2) — they differ for dual
    // nationals or stateless persons.  The issuing country determines which
    // language/script the visual fields are printed in.
    let issuing_country = {
        let s = issuing_state.replace('<', "");
        if s.len() == 3 { Some(s) } else { None }
    };

    Some(ExtractedData {
        first_name,
        last_name,
        second_last_name,
        middle_name: None,
        document_number,
        document_type: Some("PASSPORT".to_string()),
        nationality,
        date_of_birth,
        expiry_date,
        gender,
        home_address: None,
        country: issuing_country,
        has_photo: true,
    })
}

/// Parse MRZ name field (used by both TD3 line1 and TD1 line3).
///
/// MRZ name encoding: `SURNAME<<GIVEN1<GIVEN2<<<...`
///   `<<` (double filler) separates surname block from given-name block.
///   `<`  (single filler) separates individual name components within each block.
///
/// For Spanish passports: may have two surnames before `<<`, separated by single `<`.
///   e.g. `GARCIA<LOPEZ<<MARIA<CARMEN` → ap1=GARCIA, ap2=LOPEZ, fn=MARIA CARMEN
fn parse_mrz_names(name_field: &str) -> (Option<String>, Option<String>, Option<String>) {
    // Trim trailing fillers
    let trimmed = name_field.trim_matches('<');
    if trimmed.is_empty() {
        return (None, None, None);
    }

    if let Some(sep) = trimmed.find("<<") {
        let surnames_raw = &trimmed[..sep];
        let given_raw = trimmed[sep + 2..].trim_matches('<');

        // Surnames: split on single < (Spanish two-surname passports)
        let sur_parts: Vec<&str> = surnames_raw.split('<').filter(|s| !s.is_empty()).collect();
        let last_name = sur_parts
            .first()
            .map(|s| correct_mrz_alpha(s))
            .filter(|s| !s.is_empty());
        let second_last_name = if sur_parts.len() > 1 {
            Some(correct_mrz_alpha(&sur_parts[1..].join(" ")))
        } else {
            None
        };

        // Given names: single < is a word separator
        let given = given_raw.replace('<', " ").trim().to_string();
        let first_name = if given.is_empty() { None } else { Some(given) };

        (last_name, second_last_name, first_name)
    } else {
        // No double separator — treat whole field as surname
        let sur = trimmed.replace('<', " ").trim().to_string();
        let surname = if sur.is_empty() {
            None
        } else {
            Some(correct_mrz_alpha(&sur))
        };
        (surname, None, None)
    }
}

/// Convert MRZ YYMMDD → YYYY-MM-DD with century heuristic (00-30 → 20xx, else 19xx).
fn normalise_mrz_date(yymmdd: &str) -> Option<String> {
    if yymmdd.len() != 6 {
        return None;
    }
    let yy: u32 = yymmdd[0..2].parse().ok()?;
    let mm: u32 = yymmdd[2..4].parse().ok()?;
    let dd: u32 = yymmdd[4..6].parse().ok()?;
    if !(1..=12).contains(&mm) || !(1..=31).contains(&dd) {
        return None;
    }
    let year = if yy <= 30 { 2000 + yy } else { 1900 + yy };
    Some(format!("{year:04}-{mm:02}-{dd:02}"))
}

// ── MRZ check digit (ICAO Doc 9303, Part 3, §4.9) ────────────────────────────
//
// From the tutorial: uses repeating weight pattern 7-3-1.
// Characters A-Z → 10-35, digits 0-9 → 0-9, filler '<' → 0.
// Returns the expected single-digit check digit (0-9).

pub fn calculate_check_digit(input: &str) -> u32 {
    let weights = [7u32, 3, 1];
    let mut sum: u32 = 0;
    for (i, ch) in input.chars().enumerate() {
        let val: u32 = match ch {
            '0'..='9' => ch as u32 - '0' as u32,
            'A'..='Z' => ch as u32 - 'A' as u32 + 10,
            '<' => 0,
            _ => 0,
        };
        sum += val * weights[i % 3];
    }
    sum % 10
}

/// Correct common OCR confusions in MRZ character strings.
/// In numeric-only MRZ fields: O→0, I→1, S→5, B→8, G→6, Z→2, Q→0.
/// In alpha-only fields: 0→O, 1→I.
fn correct_mrz_numeric(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'O' => '0',
            'I' => '1',
            'S' => '5',
            'B' => '8',
            'G' => '6',
            'Q' => '0',
            other => other,
        })
        .collect()
}

fn correct_mrz_alpha(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            '0' => 'O',
            '1' => 'I',
            other => other,
        })
        .collect()
}

// ── TD1 MRZ parser (ICAO 3-line × 30 chars — Spanish DNI back) ───────────────
//
// Line 1 (30): type(2) issuer(3) doc_num(9) check(1) optional(15)
//   Spanish DNI: "IDESP" + support_num(9) + check + dni_in_optional(15)
// Line 2 (30): dob(6) check(1) sex(1) expiry(6) check(1) nationality(3)
//              optional(11) check(1)
// Line 3 (30): surname<<given_names (with filler <)
//
// Tutorial insight: format routing by total character count is reliable
//   (TD1=90, TD2=72, TD3=88 after whitespace removal).

fn parse_mrz_td1(text: &str) -> Option<ExtractedData> {
    // Find lines that look like MRZ: ≥20 chars, all uppercase letters/digits/<
    let candidates: Vec<String> = text
        .lines()
        .map(|l| {
            // Correct the entire line for common MRZ confusions before filtering
            let stripped = l.trim().replace(' ', "");
            stripped
        })
        .filter(|l| {
            l.len() >= 20
                && l.chars()
                    .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '<')
        })
        .collect();

    if candidates.len() < 3 {
        return None;
    }

    // Find the TD1 triplet: look for line1 starting with I/A/C (ID card type codes)
    // Tutorial: type char is P(passport), I/A/C (ID cards/travel docs)
    let mut line1: Option<&str> = None;
    let mut line2: Option<&str> = None;
    let mut line3: Option<&str> = None;

    for i in 0..candidates.len().saturating_sub(2) {
        let l1 = &candidates[i];
        let l2 = &candidates[i + 1];
        let l3 = &candidates[i + 2];

        // TD1 detection: line1 starts with I/A/C + 1 char + 3-letter country
        if l1.len() >= 28 && l2.len() >= 28 && l3.len() >= 28 {
            let first_char = l1.chars().next().unwrap_or(' ');
            let is_td1 = matches!(first_char, 'I' | 'A' | 'C')
                && l1.chars().skip(2).take(3).all(|c| c.is_ascii_uppercase());
            let is_td3 = first_char == 'P'; // passport — skip

            if is_td1 && !is_td3 {
                line1 = Some(l1.as_str());
                line2 = Some(l2.as_str());
                line3 = Some(l3.as_str());
                break;
            }
        }
    }

    let (l1, l2, l3) = (line1?, line2?, line3?);

    // ── Line 1: issuer + document number ─────────────────────────────────────
    // Pad to 30 chars if OCR dropped trailing fillers
    let l1 = format!("{:<30}", l1);
    let l2 = format!("{:<30}", l2);
    let l3 = format!("{:<30}", l3);

    let issuer = l1.get(2..5).map(correct_mrz_alpha).unwrap_or_default();
    let doc_num_raw = l1.get(5..14).map(correct_mrz_numeric).unwrap_or_default();
    let doc_check = l1
        .chars()
        .nth(14)
        .and_then(|c| c.to_digit(10))
        .unwrap_or(99);

    // Validate doc number check digit
    let doc_num_valid = calculate_check_digit(&doc_num_raw) == doc_check;
    let document_number = if !doc_num_raw.trim_matches('<').is_empty() {
        // Spanish DNI: the actual DNI/NIE number may be in the optional field (pos 15-29)
        let optional = l1.get(15..30).map(correct_mrz_numeric).unwrap_or_default();
        let optional_clean = optional.trim_matches('<');

        // Try to extract DNI (8 digits + letter) or NIE (X/Y/Z + 7 digits + letter) from optional
        let dni_in_optional = {
            let re_nie = Regex::new(r"([XYZ]\d{7}[A-Z])").unwrap();
            let re_dni = Regex::new(r"(\d{8}[A-Z])").unwrap();
            re_nie
                .captures(optional_clean)
                .and_then(|c| c.get(1))
                .or_else(|| re_dni.captures(optional_clean).and_then(|c| c.get(1)))
                .map(|m| m.as_str().to_string())
        };

        dni_in_optional.unwrap_or_else(|| {
            // Fall back to the standard 9-char doc number field (support number)
            if doc_num_valid {
                doc_num_raw.trim_matches('<').to_string()
            } else {
                doc_num_raw
                    .replace('O', "0")
                    .replace('I', "1")
                    .trim_matches('<')
                    .to_string()
            }
        })
    } else {
        String::new()
    };

    // ── Line 2: DOB, sex, expiry, nationality ─────────────────────────────────
    let dob_raw = l2.get(0..6).map(correct_mrz_numeric).unwrap_or_default();
    let dob_check = l2.chars().nth(6).and_then(|c| c.to_digit(10)).unwrap_or(99);
    let sex_char = l2.chars().nth(7).unwrap_or('<');
    let expiry_raw = l2.get(8..14).map(correct_mrz_numeric).unwrap_or_default();
    let nat_raw = l2.get(15..18).map(correct_mrz_alpha).unwrap_or_default();

    let dob_valid = calculate_check_digit(&dob_raw) == dob_check;
    let date_of_birth = if dob_valid || dob_raw.chars().all(|c| c.is_ascii_digit()) {
        normalise_mrz_date(&dob_raw)
    } else {
        None
    };

    // Expiry date properly stored in expiry_date field
    let expiry_date = normalise_mrz_date(&expiry_raw);

    let gender = match sex_char {
        'M' => Some("M".to_string()),
        'F' => Some("F".to_string()),
        'X' => Some("X".to_string()),
        _ => None,
    };

    let nationality = if nat_raw.trim_matches('<').len() == 3 {
        Some(nat_raw.replace('<', ""))
    } else if issuer.len() == 3 && issuer != "<<" {
        Some(issuer)
    } else {
        Some("ESP".to_string()) // default for Spanish DNI
    };

    // ── Line 3: names (SURNAME<<GIVEN_NAMES, shared helper) ──────────────────
    // TD1 line3 uses same ICAO name encoding as TD3 line1.
    let (last_name, second_last_name, first_name) = parse_mrz_names(l3.trim_matches('<'));

    // Build result — only return Some if we extracted meaningful data
    let has_data = !document_number.is_empty() || date_of_birth.is_some() || last_name.is_some();
    if !has_data {
        return None;
    }

    Some(ExtractedData {
        first_name,
        last_name,
        second_last_name,
        middle_name: None,
        document_number: if document_number.is_empty() {
            None
        } else {
            Some(document_number)
        },
        document_type: Some("DNI".to_string()),
        nationality,
        date_of_birth,
        expiry_date,
        gender,
        home_address: None,
        country: None,
        has_photo: false,
    })
}

// ── Shared sub-extractors for DNI / NIE ──────────────────────────────────────

fn dni_nie_nationality(upper: &str, norm: &str) -> Option<String> {
    // Same-line with optional bilingual suffix: "NACIONALIDAD / NAZIONALITATEA   ESP"
    // or "NACIONALIDAD/NATIONALITY ARG"
    // FIXED: use [ \t]* (not \s+) after the label to avoid crossing newlines
    let same_re = Regex::new(r"(?i)NACIONALIDAD(?:[ \t]*/[ \t]*\w+)?[ \t]+([A-Z]{2,3})\b").unwrap();
    // Next-line: "NACIONALIDAD\nESP"
    let next_re = Regex::new(r"(?i)NACIONALIDAD[^\r\n]*[\r\n]+\s*([A-Z]{2,3})\b").unwrap();
    // Known 3-letter ISO codes fallback
    let known_re = Regex::new(
        r"\b(ESP|FRA|GBR|DEU|ITA|PRT|USA|BEL|NLD|CHE|AUT|SWE|NOR|DNK|FIN|POL|\
CZE|HUN|ROU|BGR|HRV|SVK|SVN|EST|LVA|LTU|CYP|MLT|GRC|IRL|LUX|MAR|ARG|BRA|\
MEX|COL|VEN|PER|ECU|CHL|URY|CHN|JPN|KOR|IND|PAK|BGD|NGA|ETH)\b",
    )
    .unwrap();
    first_match(&same_re, upper)
        .or_else(|| first_match(&next_re, upper))
        .or_else(|| first_match(&known_re, norm))
}

fn dni_nie_gender(upper: &str) -> Option<String> {
    // Same-line: "SEXO M"  /  "SEXO / SEXUA M"  /  "SEXO/SEX F"  /  "SEXO / SEXE F"
    // Note: use [ \t]* around / so we don't cross line boundaries
    let same_re = Regex::new(r"(?i)SEXO(?:[ \t]*/[ \t]*\w+)?[ \t]+([MF])\b").unwrap();
    // Next-line: SEXO label row + M/F value on next row (older DNI layout)
    let next_re = Regex::new(r"(?i)SEXO[^\r\n]*[\r\n]+\s*([MF])\b").unwrap();
    first_match(&same_re, upper).or_else(|| first_match(&next_re, upper))
}

/// Extract (gender, nationality) from Spanish ID cards.
///
/// All Spanish ID cards (DNI, NIE) have a data row: "M   ESP" or "F   ARG"
/// directly below the SEXO/NACIONALIDAD header labels.
/// The multiline `^[MF][ \t]+([A-Z]{2,3})\b` pattern reliably captures both.
fn extract_sex_nationality(upper: &str) -> (Option<String>, Option<String>) {
    // Primary: data row starting with M or F followed by 2-3 letter nationality code
    // Handles: "M   ESP", "M   ESP   14 02 2006", "F   ARG   01 01 1980"
    let sex_nat_re = Regex::new(r"(?m)^([MF])[ \t]+([A-Z]{2,3})\b").unwrap();
    if let Some(caps) = sex_nat_re.captures(upper) {
        let g = caps.get(1).map(|m| m.as_str().to_string());
        let n = caps.get(2).map(|m| m.as_str().to_string());
        // Filter out 2-char codes that are too short to be reliable nationality (e.g. "ES")
        if let Some(ref nat) = n {
            if nat.len() >= 2 {
                return (g, n);
            }
        }
    }
    // Fallback: label-based gender and nationality independently
    let norm = normalise(upper);
    (dni_nie_gender(upper), dni_nie_nationality(upper, &norm))
}

/// Extract the expiry date from VALIDEZ or VALIDEZ TARJETA fields.
///
/// Handles:
///   "NUM SOPORT    VALIDEZ\nBKK114836    03  09  2029"  (DNI older)
///   "EMISION       VALIDEZ\n25 03 2022   25 03 2027"    (DNI newer — expiry is SECOND date)
///   "VALIDEZ TARJETA/CARD EXPIRY\n30 07 2021"           (NIE)
fn extract_validez(upper: &str) -> Option<String> {
    // Pattern 1: EMISION + VALIDEZ header with two dates on next line
    // e.g. "EMISION       VALIDEZ\n25 03 2022    25 03 2027"
    // e.g. "EMISIÓN / EMISSIÓ   VALIDESA\n14 07 2022    14 07 2027"  (Catalan bilingual)
    // Expiry is the SECOND date on the data row.
    //
    // NOTE: `(?i)` only handles ASCII case. `EMISIÓN` contains U+00D3 (Ó) which
    // `(?i)EMISION` will NOT match. We handle it with the character class [OÓ].
    let emision_re = Regex::new(
        r"EMISI[O\u{00D3}]N[^\r\n]*VALID[^\r\n]*[\r\n]+\s*\d{1,2}[ \t]+\d{1,2}[ \t]+\d{4}[ \t]+(\d{2})[ \t]+(\d{2})[ \t]+(\d{4})"
    ).unwrap();
    if let Some(caps) = emision_re.captures(upper) {
        return Some(format!("{}-{}-{}", &caps[3], &caps[2], &caps[1]));
    }

    // Pattern 2: VALIDEZ on header row, date on next row (DNI older / NIE)
    let validez_next =
        Regex::new(r"(?i)VALIDEZ[^\r\n]*[\r\n]+[ \t]*(\d{2})[ \t]+(\d{2})[ \t]+(\d{4})").unwrap();
    if let Some(caps) = validez_next.captures(upper) {
        return Some(format!("{}-{}-{}", &caps[3], &caps[2], &caps[1]));
    }

    // Pattern 3: VALIDEZ with date on the same row (older inline format)
    // Guard: must have VALIDEZ then whitespace then date (not just VALIDEZ at end of line)
    let validez_same =
        Regex::new(r"(?i)VALIDEZ[^\r\n/]*?[ \t]+(\d{2})[ \t]+(\d{2})[ \t]+(\d{4})").unwrap();
    if let Some(caps) = validez_same.captures(upper) {
        let year: u32 = caps[3].parse().unwrap_or(0);
        if year >= 2000 {
            return Some(format!("{}-{}-{}", &caps[3], &caps[2], &caps[1]));
        }
    }

    // Final fallback: any date >= 2020 appearing after VALIDEZ or VALIDESA (Catalan)
    // Try "VALIDEZ" first, then the broader "VALID" prefix.
    let valid_idx = upper.find("VALIDEZ").or_else(|| upper.find("VALIDESA"));
    if let Some(idx) = valid_idx {
        let after = &upper[idx..];
        let date_re = Regex::new(r"(\d{2})[ \t]+(\d{2})[ \t]+(\d{4})").unwrap();
        if let Some(caps) = date_re.captures(after) {
            let year: u32 = caps[3].parse().unwrap_or(0);
            if year >= 2020 {
                return Some(format!("{}-{}-{}", &caps[3], &caps[2], &caps[1]));
            }
        }
    }

    None
}

/// Extract (ap1, ap2) from DNI APELLIDOS section.
///
/// APELLIDOS label variants (all same-line; no crossing newlines):
///   "APELLIDOS"                        (plain older)
///   "APELLIDOS / ABIZENAK"             (Basque bilingual)
///   "APELLIDOS / COGNOMS"              (Catalan bilingual)
///   "APELLIDOS / COGNOMES"             (Valencian)
///
/// After the label, surnames appear on consecutive lines:
///   RONCERO           ← ap1
///   GARRIDO           ← ap2
///   (or "RODA MARTINEZ" on a single line when regional)
fn extract_dni_surnames(upper: &str) -> (Option<String>, Option<String>) {
    // AP_LABEL: "APELLIDOS" + optional same-line bilingual "/ WORD" or "/ WORD WORD"
    // CRITICAL: use [ \t] not \s to avoid crossing newlines.
    let ap_label = r"(?i)APELLIDOS(?:[ \t]*/[ \t]*(?:\w+(?:[ \t]+\w+)?)?)?";
    // Word class: 2+ accented uppercase letters, allowing spaces within a word group
    let wc = r"[A-Z\u00C0-\u024F]{2,}(?:[ \t]+[A-Z\u00C0-\u024F]+)*";

    // Two consecutive lines after label
    let two_re = Regex::new(&format!(
        r"{ap_label}[ \t]*[\r\n]+[ \t]*({wc})[ \t]*[\r\n]+[ \t]*({wc})"
    ))
    .unwrap();

    // Single line after label (Catalan: "RODA MARTINEZ")
    let one_re = Regex::new(&format!(r"{ap_label}[ \t]*[\r\n]+[ \t]*({wc})")).unwrap();

    if let Some(caps) = two_re.captures(upper) {
        let ap1 = caps.get(1).map(|m| m.as_str().trim().to_string());
        let ap2 = caps
            .get(2)
            .map(|m| m.as_str().trim().to_string())
            .filter(|s| {
                !s.starts_with("NOMBRE")
                    && !s.starts_with("SEXO")
                    && !s.starts_with("FECHA")
                    && !s.starts_with("NUM")
                    && !s.starts_with("NACIMIENTO")
                    && !s.starts_with("EMISION")
                    && !s.starts_with("NATIONAL")
                    && !s.starts_with("VALIDEZ")
                    && !s.starts_with("TIPO")
            });
        // If ap2 was filtered and ap1 has a space, ap1 holds both surnames
        if ap2.is_none() {
            if let Some(ref a1) = ap1 {
                if let Some(pos) = a1.find(' ') {
                    return (Some(a1[..pos].to_string()), Some(a1[pos + 1..].to_string()));
                }
            }
        }
        return (ap1, ap2);
    }

    if let Some(cap) = one_re.captures(upper) {
        let combined = cap.get(1).map_or("", |m| m.as_str()).trim();
        let parts: Vec<&str> = combined.splitn(2, ' ').collect();
        return (
            Some(parts[0].to_string()),
            parts.get(1).map(|s| s.to_string()),
        );
    }

    (None, None)
}

/// Extract (ap1, ap2, first_name) from NIE / Permiso de Residencia.
///
/// NIE label: "APELLIDOS Nombres / SURNAMES Forenames" (all on ONE line).
/// Names on following lines, mixed case allowed:
///   Variant 1 (combined): "WILLIAM John"  → ap1=WILLIAM, fn=John
///   Variant 2 (3 lines):  MUESTRA / SAMPLE / Carmen → ap1/ap2/fn
///   Variant 3 (compound): FERNÁNDEZ-MENDOZA / LÓPEZ DE HARO / Maria Inmaculada
fn extract_nie_names(text: &str) -> (Option<String>, Option<String>, Option<String>) {
    // The NIE label always starts with "APELLIDOS" followed by "Nombres" or "Nombre"
    // then possibly " / SURNAMES Forenames"
    let label_re = Regex::new(r"(?i)APELLIDOS\s+(?:Nombres?|Names?)[^\r\n]*").unwrap();

    // Find label position in original text (not uppercase) for mixed-case extraction
    let label_end = label_re.find(text).map(|m| m.end()).unwrap_or(0);
    let after_label = &text[label_end.min(text.len())..];

    // Collect non-empty lines until we hit a known section header
    let stop_words = [
        "SEXO",
        "TIPO",
        "OBSERV",
        "NIE",
        "RESID",
        "PERSONAL",
        "AUTORIZA",
        "PRORROGA",
        "TARJETA",
        "TRABAJAD",
        "EXTRANJER",
    ];
    let name_lines: Vec<&str> = after_label
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .take_while(|l| {
            let u = l.to_uppercase();
            !stop_words.iter().any(|sw| u.starts_with(sw))
        })
        .take(4)
        .collect();

    match name_lines.len() {
        0 => {
            // Fallback to uppercase-only extraction
            let (ap1, ap2) = extract_dni_surnames(&text.to_uppercase());
            (ap1, ap2, None)
        }
        1 => {
            // Combined line: all UPPERCASE = just surname; mixed = surname(s) + given
            let line = name_lines[0];
            if line == line.to_uppercase() {
                // All uppercase → single surname
                (Some(line.to_uppercase()), None, None)
            } else {
                // Mixed case: split on first lowercase-starting word
                let parts: Vec<&str> = line.split_whitespace().collect();
                let split_at = parts
                    .iter()
                    .position(|p| p.chars().next().is_some_and(|c| c.is_lowercase()))
                    .unwrap_or(1);
                let surname = parts[..split_at].join(" ").to_uppercase();
                let given = parts[split_at..].join(" ");
                (
                    if surname.is_empty() {
                        None
                    } else {
                        Some(surname)
                    },
                    None,
                    if given.is_empty() { None } else { Some(given) },
                )
            }
        }
        2 => {
            let l0_all_upper = name_lines[0] == name_lines[0].to_uppercase();
            let l1_all_upper = name_lines[1] == name_lines[1].to_uppercase();
            if l0_all_upper && !l1_all_upper {
                // Line 0: surname(s), line 1: first name (mixed case = given name)
                let sur_parts: Vec<&str> = name_lines[0].split_whitespace().collect();
                (
                    Some(sur_parts[0].to_string()),
                    if sur_parts.len() > 1 {
                        Some(sur_parts[1..].join(" "))
                    } else {
                        None
                    },
                    Some(name_lines[1].to_string()),
                )
            } else {
                // Both uppercase: ap1 + ap2
                (
                    Some(name_lines[0].to_uppercase()),
                    Some(name_lines[1].to_uppercase()),
                    None,
                )
            }
        }
        _ => {
            // 3+ lines: ap1, ap2, first_name (preserve mixed case for first name)
            (
                Some(name_lines[0].to_uppercase()),
                Some(name_lines[1].to_uppercase()),
                Some(name_lines[2].to_string()),
            )
        }
    }
}

/// Extract first name from NOMBRE label (DNI / NIE fallback).
fn extract_dni_nombre(upper: &str, norm: &str) -> Option<String> {
    let wc = r"[A-Z\u00C0-\u024F]+(?:[ \t]+[A-Z\u00C0-\u024F]+)*";
    // NOMBRE label: optional same-line bilingual "/ WORD"
    let nom_label = r"(?i)NOMBRE(?:[ \t]*/[ \t]*\w+)?";

    // Same-line: "NOMBRE  MANUEL ALFONSO"  or  "NOMBRE / IZENA  JOEL"
    let same_re = Regex::new(&format!(r"{nom_label}[ \t]+({wc})[ \t]*[\r\n]")).unwrap();
    // Next-line: "NOMBRE\nMANUEL ALFONSO"
    let next_re = Regex::new(&format!(
        r"{nom_label}[ \t]*[\r\n]+[ \t]*({wc})[ \t]*[\r\n]"
    ))
    .unwrap();
    // Norm fallback (collapsed whitespace)
    let norm_re =
        Regex::new(r"(?i)NOMBRE(?:/\w+)?\s+([A-Z\u00C0-\u024F]+(?:\s+[A-Z\u00C0-\u024F]+){0,3})")
            .unwrap();

    first_match(&same_re, upper)
        .or_else(|| first_match(&next_re, upper))
        .or_else(|| first_match(&norm_re, norm))
        .map(|s| s.trim().to_string())
}

// ── Home address extractor ────────────────────────────────────────────────────

/// Extract home address from the DOMICILIO / DOMICILI label.
///
/// DNI back side (older and newer cards) prints:
///   DOMICILIO
///   C/ MAYOR 1 2D
///   28001 MADRID
///
/// Catalan bilingual:
///   DOMICILIO / DOMICILI
///   CARRER DE LA PAU 5 3R 2A
///   08001 BARCELONA
///
/// We collect lines after the DOMICILIO label until we hit a known stop-word
/// section label (MUNICIPIO, PROVINCIA, PAIS, NUM SOPORTE, OBSERV, etc.)
/// or until we have 3 non-empty lines (address + postal code+city is typically 2 lines).
fn extract_home_address(text: &str) -> Option<String> {
    // Find DOMICILIO label in the original text (preserves mixed case/accents in address)
    let dom_re = Regex::new(r"(?i)DOMICILIO(?:[ \t]*/[ \t]*DOMICILI)?[ \t]*[\r\n]").unwrap();
    let label_end = dom_re.find(text).map(|m| m.end())?;
    let after = &text[label_end..];

    // Stop collecting lines at any of these section keywords
    let stop_words = [
        "MUNICIPIO",
        "MUNICIPI",
        "PROVINCIA",
        "PAIS",
        "PAÍS",
        "NUM SOPORTE",
        "NUM. SOPORTE",
        "SOPORTE",
        "OBSERV",
        "FIRMA",
        "MACHINE",
        "IDESPE",
        "IDESP", // MRZ-like lines
        "NACIMIENTO",
        "NOMBRE",
        "APELLIDO",
    ];

    let address_lines: Vec<&str> = after
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .take_while(|l| {
            let u = l.to_uppercase();
            // Stop at known section headers
            if stop_words.iter().any(|sw| u.starts_with(sw)) {
                return false;
            }
            // Stop at MRZ lines (all uppercase alphanumeric + '<', ≥ 20 chars)
            if l.len() >= 20
                && l.chars()
                    .all(|c| c.is_ascii_uppercase() || c == '<' || c.is_ascii_digit())
            {
                return false;
            }
            true
        })
        .take(3) // address line(s) + postal code + city → at most 3 lines
        .collect();

    if address_lines.is_empty() {
        return None;
    }
    Some(address_lines.join(", "))
}

// ── Result builder ────────────────────────────────────────────────────────────

#[allow(clippy::too_many_arguments)]
fn build_result(
    document_number: Option<String>,
    date_of_birth: Option<String>,
    expiry_date: Option<String>,
    first_name: Option<String>,
    last_name: Option<String>,
    second_last_name: Option<String>,
    nationality: Option<String>,
    gender: Option<String>,
    home_address: Option<String>,
    doc_type_str: &str,
) -> (ExtractedData, f64) {
    let total = match doc_type_str {
        "PASSPORT" => 5, // no gender in confidence for passport (often missing)
        _ => 6,
    };
    let filled = [
        document_number.is_some(),
        date_of_birth.is_some(),
        first_name.is_some(),
        last_name.is_some(),
        nationality.is_some(),
        gender.is_some() || doc_type_str == "PASSPORT",
    ]
    .iter()
    .take(total)
    .filter(|&&x| x)
    .count();

    let confidence = filled as f64 / total as f64;

    let data = ExtractedData {
        first_name,
        last_name,
        second_last_name,
        middle_name: None,
        document_number,
        document_type: Some(doc_type_str.to_string()),
        nationality,
        date_of_birth,
        expiry_date,
        gender,
        home_address,
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
        DocumentType::Dni => parse_dni(text),
        DocumentType::Nie => parse_nie(text),
        DocumentType::Passport => parse_passport(text),
    }
}

// ── Script-family classification ──────────────────────────────────────────────
//
// For foreign passports, the ISSUING country (from MRZ line 1 positions 2-4)
// determines which writing system the visual fields use.  MRZ itself is ALWAYS
// Latin/ASCII (ICAO Doc 9303, Part 3, §4.1) regardless of national language —
// so the MRZ data path works for every passport.  Visual field extraction via
// regex / label detection only works for the Latin-script group.
//
// Strategy by script family:
//   Latin       → current label regex + MRZ (full coverage)
//   Cyrillic    → MRZ only + optionally Tesseract rus/ukr/bul data files
//   Arabic      → MRZ only + optionally Tesseract ara/fas data files
//   CJK         → MRZ only + optionally PP-OCR CJK model (rusto-rs / retto)
//   Devanagari  → MRZ only + optionally Tesseract hin/nep data files
//   Other       → MRZ only (sufficient for hostel check-in)

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScriptFamily {
    /// Latin alphabet — fully supported by current label regex parser
    Latin,
    /// Cyrillic script (Russia, Ukraine, Bulgaria, Serbia, Mongolia…)
    Cyrillic,
    /// Arabic script (Arab states, Iran/Farsi, Pakistan/Urdu…)
    Arabic,
    /// CJK (Chinese Simplified, Traditional, Japanese, Korean)
    Cjk,
    /// Devanagari (India/Hindi, Nepal, …)
    Devanagari,
    /// Other / Unknown — MRZ-only fallback
    Other,
}

impl ScriptFamily {
    /// Returns `true` when the current OCR pipeline can extract visual fields
    /// in addition to MRZ data.  For non-Latin scripts, MRZ data alone is
    /// returned and a warning is emitted.
    pub fn visually_parseable(&self) -> bool {
        matches!(self, ScriptFamily::Latin)
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            ScriptFamily::Latin => "latin",
            ScriptFamily::Cyrillic => "cyrillic",
            ScriptFamily::Arabic => "arabic",
            ScriptFamily::Cjk => "cjk",
            ScriptFamily::Devanagari => "devanagari",
            ScriptFamily::Other => "other",
        }
    }

    /// Suggest which Tesseract language data file (`.traineddata`) would improve
    /// visual-field accuracy for this script family.
    pub fn suggested_tesseract_lang(&self) -> Option<&'static str> {
        match self {
            ScriptFamily::Latin => None, // already handled
            ScriptFamily::Cyrillic => Some("rus+ukr+bul"),
            ScriptFamily::Arabic => Some("ara+fas"),
            ScriptFamily::Cjk => Some("chi_sim+chi_tra+jpn+kor"),
            ScriptFamily::Devanagari => Some("hin+nep+san"),
            ScriptFamily::Other => None,
        }
    }
}

/// Map an ISO 3166-1 alpha-3 country code (from the MRZ issuing-state field)
/// to a writing system family.
///
/// Latin-script coverage is intentionally broad — when in doubt, Latin is used
/// because the MRZ parser will still give complete data and the label parser
/// at worst returns empty visual fields (no panic, no garbage).
pub fn script_family_for_country(iso3: &str) -> ScriptFamily {
    match iso3 {
        // ── Cyrillic ──────────────────────────────────────────────────────────
        // Note: BGR (Bulgaria) passports transliterate to Latin per ICAO,
        // so it's in the Latin block below even though domestic script is Cyrillic.
        "RUS" | "UKR" | "BLR" | "SRB" | "MKD" | "MNE" | "KAZ" | "KGZ" | "TJK"
        | "TKM" | "UZB" | "MNG" => ScriptFamily::Cyrillic,

        // ── Arabic ────────────────────────────────────────────────────────────
        "SAU" | "ARE" | "QAT" | "KWT" | "BHR" | "OMN" | "YEM" | "IRQ" | "SYR" | "LBN"
        | "JOR" | "PSE" | "EGY" | "LBY" | "TUN" | "DZA" | "MAR" | "MRT" | "SDN" | "SOM"
        | "IRN" | "AFG" | "PAK" => ScriptFamily::Arabic,

        // ── CJK ───────────────────────────────────────────────────────────────
        "CHN" | "TWN" | "HKG" | "MAC" | "JPN" | "KOR" | "PRK" => ScriptFamily::Cjk,

        // ── Devanagari ────────────────────────────────────────────────────────
        "IND" | "NPL" | "BTN" => ScriptFamily::Devanagari,

        // ── Latin (explicit whitelist — EU/EEA + common travel countries) ─────
        // Spain, Portugal, France, Germany, Italy, Netherlands, Belgium,
        // Austria, Switzerland, UK, Ireland, Nordics, Baltics, Balkans,
        // Americas, Oceania, Sub-Saharan Africa (mostly Latin-script),
        // Southeast Asia (Indonesia, Philippines, Vietnam, Thailand uses Latin
        // for passport names per ICAO), etc.
        "ESP" | "PRT" | "FRA" | "DEU" | "ITA" | "NLD" | "BEL" | "AUT" | "CHE" | "GBR"
        | "IRL" | "SWE" | "NOR" | "DNK" | "FIN" | "ISL" | "LUX" | "MCO" | "AND" | "MLT"
        | "CYP" | "GRC" | "POL" | "CZE" | "SVK" | "HUN" | "ROU" | "BGR" | "HRV" | "SVN"
        | "EST" | "LVA" | "LTU" | "ALB" | "BIH" | "XKX" | "USA" | "CAN" | "MEX" | "BRA"
        | "ARG" | "CHL" | "COL" | "PER" | "VEN" | "URY" | "PRY" | "BOL" | "ECU" | "CRI"
        | "PAN" | "CUB" | "DOM" | "AUS" | "NZL" | "ZAF" | "NGA" | "KEN" | "ETH" | "GHA"
        | "TZA" | "UGA" | "ZMB" | "ZWE" | "MOZ" | "AGO" | "CMR" | "IDN" | "PHL" | "VNM"
        | "THA" | "MYS" | "SGP" | "ISR" | "TUR" | "AZE" | "GEO" | "ARM" => ScriptFamily::Latin,

        // ── Fallback: unknown/rare country → assume Other, use MRZ only ───────
        _ => ScriptFamily::Other,
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── DNI: older plain-label format (Manuel Alfonso Roncero Garrido) ────────
    const SAMPLE_DNI_OCR: &str = "\
ESPANA DOCUMENTO NACIONAL DE IDENTIDAD\n\
APELLIDOS\n\
RONCERO\n\
GARRIDO\n\
NOMBRE  MANUEL ALFONSO\n\
SEXO    NACIONALIDAD\n\
M       ESP             FECHA DE NACIMIENTO\n\
                        05 03 1968\n\
                        NUM SOPORTE\n\
BNQ177078               25 01 2031\n\
DNI 06232223M                       747904\n";

    #[test]
    fn test_dni_number_extracted() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(d.document_number.as_deref(), Some("06232223M"));
    }

    #[test]
    fn test_first_surname_extracted() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(d.last_name.as_deref(), Some("RONCERO"));
    }

    #[test]
    fn test_second_surname_extracted() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(d.second_last_name.as_deref(), Some("GARRIDO"));
    }

    #[test]
    fn test_first_name_extracted() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("MANUEL"), "Expected MANUEL, got: {name}");
    }

    #[test]
    fn test_date_of_birth_not_validity_date() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1968-03-05"),
            "DOB should be 1968-03-05 not 2031-01-25"
        );
    }

    #[test]
    fn test_nationality_is_esp() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(d.nationality.as_deref(), Some("ESP"));
    }

    #[test]
    fn test_gender_is_male() {
        let (d, _) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert_eq!(d.gender.as_deref(), Some("M"));
    }

    #[test]
    fn test_confidence_high_when_all_fields_present() {
        let (_, c) = parse(SAMPLE_DNI_OCR, &DocumentType::Dni);
        assert!(c >= 0.8, "Confidence should be ≥0.8, got {c}");
    }

    #[test]
    fn test_validity_date_not_in_dob() {
        let text = "VALIDEZ 25 01 2031\nFECHA DE NACIMIENTO 05 03 1968\nDNI 12345678A\n";
        let (d, _) = parse(text, &DocumentType::Dni);
        assert_eq!(d.date_of_birth.as_deref(), Some("1968-03-05"));
    }

    #[test]
    fn test_normalise_date_dd_mm_yyyy() {
        assert_eq!(normalise_date("05 03 1968"), Some("1968-03-05".to_string()));
        assert_eq!(normalise_date("05/03/1968"), Some("1968-03-05".to_string()));
        assert_eq!(normalise_date("05-03-1968"), Some("1968-03-05".to_string()));
        assert_eq!(normalise_date("05031968"), Some("1968-03-05".to_string()));
    }

    #[test]
    fn test_no_false_nationality_from_dni_label() {
        let text = "DNI 06232223M\nNACIONALIDAD\nESP\n";
        let (d, _) = parse(text, &DocumentType::Dni);
        assert_eq!(d.nationality.as_deref(), Some("ESP"));
    }

    // ── NIE: plain format ──────────────────────────────────────────────────────
    #[test]
    fn test_nie_number_extracted() {
        let text = "APELLIDOS\nGARCIA\nLOPEZ\nNOMBRE  MARIA\nSEXO F\n\
NACIONALIDAD COL\nFECHA DE NACIMIENTO 22 08 1992\nNIE X1234567B\n";
        let (d, _) = parse(text, &DocumentType::Nie);
        assert_eq!(d.document_number.as_deref(), Some("X1234567B"));
        assert_eq!(d.gender.as_deref(), Some("F"));
        assert_eq!(d.date_of_birth.as_deref(), Some("1992-08-22"));
    }

    // ── DNI: newer Basque bilingual ────────────────────────────────────────────
    const SAMPLE_DNI_BILINGUAL: &str = "\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
APELLIDOS / ABIZENAK\n\
PASCUAL\n\
VICENTE\n\
NOMBRE / IZENA  JOEL\n\
SEXO / SEXUA  NACIONALIDAD / NAZIONALITATEA  NACIMIENTO / JAIOTEGUNA\n\
M              ESP                            15 04 1995\n\
DNI 79174145A\n";

    #[test]
    fn test_bilingual_basque_surnames() {
        let (d, _) = parse(SAMPLE_DNI_BILINGUAL, &DocumentType::Dni);
        assert_eq!(
            d.last_name.as_deref(),
            Some("PASCUAL"),
            "ap1 should be PASCUAL"
        );
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("VICENTE"),
            "ap2 should be VICENTE"
        );
    }

    #[test]
    fn test_bilingual_basque_first_name() {
        let (d, _) = parse(SAMPLE_DNI_BILINGUAL, &DocumentType::Dni);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("JOEL"), "Expected JOEL, got: {name}");
    }

    #[test]
    fn test_bilingual_basque_gender_and_nationality() {
        let (d, _) = parse(SAMPLE_DNI_BILINGUAL, &DocumentType::Dni);
        assert_eq!(d.gender.as_deref(), Some("M"));
        assert_eq!(d.nationality.as_deref(), Some("ESP"));
    }

    #[test]
    fn test_bilingual_basque_dob_same_line() {
        let (d, _) = parse(SAMPLE_DNI_BILINGUAL, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1995-04-15"),
            "DOB should be 1995-04-15, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_bilingual_basque_dni_number() {
        let (d, _) = parse(SAMPLE_DNI_BILINGUAL, &DocumentType::Dni);
        assert_eq!(d.document_number.as_deref(), Some("79174145A"));
    }

    // ── DNI: Catalan regional (both surnames on one line) ─────────────────────
    const SAMPLE_DNI_CATALAN: &str = "\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
APELLIDOS / COGNOMS\n\
RODA MARTINEZ\n\
NOMBRE / NOM  JESICA\n\
SEXO / SEXE F  NACIONALIDAD / NACIONALITAT  ESP  FECHA DE NACIMIENTO / DATA DE NAIXEMENT  22 11 1988\n\
DNI 48594702A\n";

    #[test]
    fn test_catalan_surnames_single_line() {
        let (d, _) = parse(SAMPLE_DNI_CATALAN, &DocumentType::Dni);
        assert_eq!(d.last_name.as_deref(), Some("RODA"), "ap1 should be RODA");
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("MARTINEZ"),
            "ap2 should be MARTINEZ"
        );
    }

    #[test]
    fn test_catalan_first_name() {
        let (d, _) = parse(SAMPLE_DNI_CATALAN, &DocumentType::Dni);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("JESICA"), "Expected JESICA, got: {name}");
    }

    #[test]
    fn test_catalan_gender_female() {
        let (d, _) = parse(SAMPLE_DNI_CATALAN, &DocumentType::Dni);
        assert_eq!(d.gender.as_deref(), Some("F"));
    }

    #[test]
    fn test_catalan_dob() {
        let (d, _) = parse(SAMPLE_DNI_CATALAN, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1988-11-22"),
            "DOB should be 1988-11-22, got {:?}",
            d.date_of_birth
        );
    }

    // ── NIE / Permiso de Residencia ───────────────────────────────────────────
    const SAMPLE_NIE_OCR: &str = "\
PERMISO DE RESIDENCIA\n\
APELLIDOS Nombres / SURNAMES Forenames\n\
MUESTRA\n\
APELLIDO\n\
CARMEN\n\
SEXO/SEX F  NACIONALIDAD/NATIONALITY ARG  FECHA NAC./BIRTH DATE 01 01 1980\n\
OBSERVACIONES\n\
NIE: X1234567P\n";

    #[test]
    fn test_nie_observaciones_number() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        assert_eq!(d.document_number.as_deref(), Some("X1234567P"));
    }

    #[test]
    fn test_nie_gender_female() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        assert_eq!(d.gender.as_deref(), Some("F"));
    }

    #[test]
    fn test_nie_nationality_arg() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        assert_eq!(d.nationality.as_deref(), Some("ARG"));
    }

    #[test]
    fn test_nie_dob_same_line() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1980-01-01"),
            "DOB should be 1980-01-01, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_nie_surnames_three_line() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        assert_eq!(d.last_name.as_deref(), Some("MUESTRA"));
        assert_eq!(d.second_last_name.as_deref(), Some("APELLIDO"));
    }

    #[test]
    fn test_nie_first_name_third_line() {
        let (d, _) = parse(SAMPLE_NIE_OCR, &DocumentType::Nie);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("CARMEN"), "Expected CARMEN, got: {name}");
    }

    // ── DNI newer with VALIDEZ and EMISION ───────────────────────────────────
    const SAMPLE_DNI_NEWER: &str = "\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
APELLIDOS\n\
LAM\n\
MARTIN\n\
NOMBRE  GUILLERMO\n\
SEXO           NACIONALIDAD\n\
M              ESP\n\
FECHA DE NACIMIENTO\n\
07  11  1985\n\
NUM SOPORTE           VALIDEZ\n\
BKK114836             03  09  2029\n\
DNI 53497500Y\n";

    #[test]
    fn test_dni_newer_validez_extracted() {
        let (d, _) = parse(SAMPLE_DNI_NEWER, &DocumentType::Dni);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2029-09-03"),
            "Expiry should be 2029-09-03, got {:?}",
            d.expiry_date
        );
    }

    #[test]
    fn test_dni_newer_dob_not_validez() {
        let (d, _) = parse(SAMPLE_DNI_NEWER, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1985-11-07"),
            "DOB should be 1985-11-07, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_dni_newer_surnames() {
        let (d, _) = parse(SAMPLE_DNI_NEWER, &DocumentType::Dni);
        assert_eq!(d.last_name.as_deref(), Some("LAM"));
        assert_eq!(d.second_last_name.as_deref(), Some("MARTIN"));
    }

    // ── DNI newer with EMISION + VALIDEZ on same header row ──────────────────
    const SAMPLE_DNI_EMISION_VALIDEZ: &str = "\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
APELLIDOS\n\
CINTAS\n\
CARRILLO\n\
NOMBRE  CRISTIAN\n\
SEXO           NACIONALIDAD\n\
M              ESP\n\
FECHA DE NACIMIENTO\n\
03  05  1937\n\
EMISION       VALIDEZ\n\
25 03 2022    25 03 2027\n\
DNI 53497500Y\n";

    #[test]
    fn test_dni_emision_validez_second_date_is_expiry() {
        let (d, _) = parse(SAMPLE_DNI_EMISION_VALIDEZ, &DocumentType::Dni);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2027-03-25"),
            "Expiry should be 2027-03-25 (second date), got {:?}",
            d.expiry_date
        );
    }

    // ── DNI 2021+ format: Sergio Llamas Diaz (real card layout) ─────────────
    //
    // Based on real DNI card (image provided by user):
    //   DNI: 77669435E
    //   Apellido 1: LLAMAS  Apellido 2: DIAZ
    //   Nombre: SERGIO
    //   Nacimiento: 14-02-2006   Sexo: M   Nac: ESP
    //   Emisión: 25-03-2022      Validez: 25-03-2027
    //   Núm. soporte: CBY160259
    //
    // Key OCR layout traits:
    //   - NOMBRE on its own line (name below it, NOT same line)
    //   - SEXO + NACIONALIDAD + NACIMIENTO all on ONE header row
    //   - M + ESP + DOB all on ONE data row below headers
    //   - EMISION + VALIDEZ on ONE header row; two dates on ONE data row below
    //   - "CBY..." soporte number at top-right (must not confuse with DNI number)
    //   - "290880" at bottom-right (security code, not DNI number)
    const SAMPLE_DNI_SERGIO: &str = "\
REINO DE ESPANA\n\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
77669435E               DNI 77669435E    CBY160259\n\
APELLIDOS\n\
LLAMAS\n\
DIAZ\n\
NOMBRE\n\
SERGIO\n\
SEXO    NACIONALIDAD    NACIMIENTO\n\
M       ESP             14 02 2006\n\
EMISION        VALIDEZ\n\
25 03 2022     25 03 2027\n\
NUM SOPORTE\n\
CBY160259\n\
                        290880\n\
NATIONAL IDENTITY CARD / DOCUMENTO NACIONAL IDENTIDAD\n";

    #[test]
    fn test_sergio_dni_number() {
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.document_number.as_deref(),
            Some("77669435E"),
            "DNI number should be 77669435E, got {:?}",
            d.document_number
        );
    }

    #[test]
    fn test_sergio_first_surname() {
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.last_name.as_deref(),
            Some("LLAMAS"),
            "Primer apellido should be LLAMAS, got {:?}",
            d.last_name
        );
    }

    #[test]
    fn test_sergio_second_surname() {
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("DIAZ"),
            "Segundo apellido should be DIAZ, got {:?}",
            d.second_last_name
        );
    }

    #[test]
    fn test_sergio_first_name() {
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.first_name.as_deref(),
            Some("SERGIO"),
            "Nombre should be SERGIO, got {:?}",
            d.first_name
        );
    }

    #[test]
    fn test_sergio_gender_and_nationality() {
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.gender.as_deref(),
            Some("M"),
            "Gender should be M, got {:?}",
            d.gender
        );
        assert_eq!(
            d.nationality.as_deref(),
            Some("ESP"),
            "Nationality should be ESP, got {:?}",
            d.nationality
        );
    }

    #[test]
    fn test_sergio_dob() {
        // DOB is 14 02 2006 → 2006-02-14
        // The tricky part: NACIMIENTO is on a header row alongside SEXO/NACIONALIDAD;
        // the actual date appears on the NEXT line after M and ESP.
        // The normalised-text fallback should find it via "NACIMIENTO M ESP 14 02 2006".
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("2006-02-14"),
            "DOB should be 2006-02-14, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_sergio_dob_not_emision() {
        // Must NOT pick 2022-03-25 (EMISION date) as DOB
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_ne!(
            d.date_of_birth.as_deref(),
            Some("2022-03-25"),
            "DOB must not be the EMISION date 2022-03-25"
        );
    }

    #[test]
    fn test_sergio_expiry_date() {
        // EMISION + VALIDEZ header → second date (25 03 2027) is expiry
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2027-03-25"),
            "Expiry should be 2027-03-25, got {:?}",
            d.expiry_date
        );
    }

    #[test]
    fn test_sergio_soporte_not_dni() {
        // CBY160259 (soporte number) must NOT appear as document_number
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_ne!(
            d.document_number.as_deref(),
            Some("CBY160259"),
            "Document number must be the DNI (77669435E), not the soporte number"
        );
    }

    #[test]
    fn test_sergio_security_code_not_dni() {
        // 290880 at bottom-right (security code, 6 digits) must NOT be document_number
        let (d, _) = parse(SAMPLE_DNI_SERGIO, &DocumentType::Dni);
        assert_ne!(
            d.document_number.as_deref(),
            Some("290880"),
            "Document number must not be the 6-digit security code"
        );
    }

    // ── NIE with VALIDEZ TARJETA ──────────────────────────────────────────────
    const SAMPLE_NIE_VALIDEZ: &str = "\
PERMISO DE RESIDENCIA   E35797128\n\
APELLIDOS Nombres / SURNAMES Forenames\n\
WILLIAM\n\
VALIDEZ TARJETA/CARD EXPIRY\n\
30 07 2021\n\
OBSERVACIONES\n\
NIE: Y63872519B\n";

    #[test]
    fn test_nie_validez_tarjeta_extracted() {
        let (d, _) = parse(SAMPLE_NIE_VALIDEZ, &DocumentType::Nie);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2021-07-30"),
            "NIE expiry should be 2021-07-30, got {:?}",
            d.expiry_date
        );
    }

    // ── NIE with mixed-case names ─────────────────────────────────────────────
    const SAMPLE_NIE_MIXED_CASE: &str = "\
PERMISO DE RESIDENCIA\n\
APELLIDOS Nombres / SURNAMES Forenames\n\
FERNANDEZ-MENDOZA\n\
LOPEZ DE HARO\n\
Maria Inmaculada\n\
SEXO/SEX F  NACIONALIDAD/NATIONALITY USA  FECHA NAC./BIRTH DATE 18 04 1995\n\
OBSERVACIONES\n\
NIE: Y63872519B\n";

    #[test]
    fn test_nie_mixed_case_first_name() {
        let (d, _) = parse(SAMPLE_NIE_MIXED_CASE, &DocumentType::Nie);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(
            name.contains("Maria") || name.contains("MARIA"),
            "Expected Maria Inmaculada (or uppercased), got: {name}"
        );
    }

    #[test]
    fn test_nie_mixed_case_surnames() {
        let (d, _) = parse(SAMPLE_NIE_MIXED_CASE, &DocumentType::Nie);
        assert!(
            d.last_name
                .as_deref()
                .is_some_and(|s| s.contains("FERNANDEZ") || s.contains("FERNÁNDEZ")),
            "ap1 should be FERNANDEZ-MENDOZA, got {:?}",
            d.last_name
        );
    }

    // ── DNI back side (TD1 MRZ) ───────────────────────────────────────────────
    const SAMPLE_DNI_MRZ_TD1: &str = "\
IDESPCAJ193499454729879E<<<<<<\n\
0305037M2609061ESP<<<<<<<<<<<1\n\
CINTAS<CARRILLO<<CRISTIAN<<<<<\n";

    #[test]
    fn test_mrz_td1_surname() {
        let (d, _) = parse(SAMPLE_DNI_MRZ_TD1, &DocumentType::Dni);
        assert_eq!(
            d.last_name.as_deref(),
            Some("CINTAS"),
            "MRZ surname should be CINTAS, got {:?}",
            d.last_name
        );
    }

    #[test]
    fn test_mrz_td1_given_name() {
        let (d, _) = parse(SAMPLE_DNI_MRZ_TD1, &DocumentType::Dni);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("CRISTIAN"), "Expected CRISTIAN, got: {name}");
    }

    #[test]
    fn test_mrz_td1_dob() {
        let (d, _) = parse(SAMPLE_DNI_MRZ_TD1, &DocumentType::Dni);
        // MRZ DOB: 030503 → 2003-05-03
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("2003-05-03"),
            "MRZ DOB should be 2003-05-03, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_mrz_td1_expiry_date() {
        let (d, _) = parse(SAMPLE_DNI_MRZ_TD1, &DocumentType::Dni);
        // MRZ expiry: 260906 → 2026-09-06
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2026-09-06"),
            "MRZ expiry should be 2026-09-06, got {:?}",
            d.expiry_date
        );
    }

    // ── Passport: ICAO MRZ (Australian specimen) ──────────────────────────────
    // MRZ from image: P<AUSCITIZEN<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    //                 PA09404097AUS8406077F1903212<17331334P<<<<08
    const SAMPLE_PASSPORT_AUS: &str = "\
PASSPORT\n\
AUSTRALIA\n\
DOCUMENT No PA0940409\n\
Name / Nom CITIZEN\n\
JANE\n\
Nationality / Nationalite AUSTRALIAN\n\
Date of birth 07 JUN 1984\n\
Sex / Sexe F\n\
Date of issue 01 MAR 2014\n\
Date of expiry 01 MAR 2024\n\
P<AUSCITIZEN<<JANE<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\
PA09404097AUS8406077F1903212<17331334P<<<<08\n";

    #[test]
    fn test_passport_mrz_doc_number() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        // PA0940409 (9-char doc field; the following '7' is the check digit)
        assert_eq!(
            d.document_number.as_deref(),
            Some("PA0940409"),
            "doc number from MRZ line 2, got {:?}",
            d.document_number
        );
    }

    #[test]
    fn test_passport_mrz_surname() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        assert_eq!(
            d.last_name.as_deref(),
            Some("CITIZEN"),
            "surname should be CITIZEN, got {:?}",
            d.last_name
        );
    }

    #[test]
    fn test_passport_mrz_given_name() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("JANE"), "Expected JANE, got: {name}");
    }

    #[test]
    fn test_passport_mrz_nationality() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        assert_eq!(d.nationality.as_deref(), Some("AUS"));
    }

    #[test]
    fn test_passport_mrz_dob() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        // MRZ DOB: 840607 → 1984-06-07
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1984-06-07"),
            "DOB should be 1984-06-07, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_passport_mrz_gender() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        assert_eq!(d.gender.as_deref(), Some("F"));
    }

    #[test]
    fn test_passport_mrz_expiry_date() {
        let (d, _) = parse(SAMPLE_PASSPORT_AUS, &DocumentType::Passport);
        // MRZ expiry: 190321 → 2019-03-21
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2019-03-21"),
            "Passport expiry should be 2019-03-21, got {:?}",
            d.expiry_date
        );
    }

    // ── Passport: Croatia specimen ────────────────────────────────────────────
    // P<HRVSPECIMEN<<SPECIMEN<<<<<<<<<<<<<<<<<<<<<
    // 0070070071HRV8212258F1407019<<<<<<<<<<<<<<<06
    const SAMPLE_PASSPORT_HRV: &str = "\
REPUBLIKA HRVATSKA REPUBLIC OF CROATIA\n\
PUTOVNICA PASSPORT PASSEPORT\n\
P HRV 007007007\n\
Prezime/Surname/Nom SPECIMEN\n\
Ime/Given name/Prenom SPECIMEN\n\
Drzavljanstvo/Nationality/Nationalite HRVATSKO\n\
Datum rodjenja/Date of birth 25.12.1982\n\
F\n\
P<HRVSPECIMEN<<SPECIMEN<<<<<<<<<<<<<<<<<<<<\n\
0070070071HRV8212258F1407019<<<<<<<<<<<<<<<06\n";

    #[test]
    fn test_passport_hrv_dob() {
        let (d, _) = parse(SAMPLE_PASSPORT_HRV, &DocumentType::Passport);
        // MRZ DOB: 821225 → 1982-12-25
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1982-12-25"),
            "DOB should be 1982-12-25, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_passport_hrv_nationality() {
        let (d, _) = parse(SAMPLE_PASSPORT_HRV, &DocumentType::Passport);
        assert_eq!(d.nationality.as_deref(), Some("HRV"));
    }

    // ── Passport: Luxembourg specimen ─────────────────────────────────────────
    // P<LUXMAUS<<KETTY<<<<<<<<<<<<<<<<<<<<<<<<<<<
    // S998527<<4LUX7806201F1108084030600210410<<<96
    const SAMPLE_PASSPORT_LUX: &str = "\
GRAND-DUCHE DE LUXEMBOURG\n\
PASSPORT\n\
P LUX S998527\n\
Numm/Nom/Surname MAUS\n\
Vornumm/Prenoms/Given names KETTY\n\
Nationalite/Nationality LUXEMBOURGEOISE\n\
Gebuer den/Date of birth 20 Juin/Jun 1978\n\
Sex/Sexe/Sex F\n\
P<LUXMAUS<<KETTY<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\
S998527<<4LUX7806201F1108084030600210410<<<96\n";

    #[test]
    fn test_passport_lux_surnames() {
        let (d, _) = parse(SAMPLE_PASSPORT_LUX, &DocumentType::Passport);
        assert_eq!(d.last_name.as_deref(), Some("MAUS"));
    }

    #[test]
    fn test_passport_lux_given_name() {
        let (d, _) = parse(SAMPLE_PASSPORT_LUX, &DocumentType::Passport);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(name.contains("KETTY"), "Expected KETTY, got: {name}");
    }

    #[test]
    fn test_passport_lux_dob() {
        let (d, _) = parse(SAMPLE_PASSPORT_LUX, &DocumentType::Passport);
        // MRZ DOB: 780620 → 1978-06-20
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1978-06-20"),
            "DOB should be 1978-06-20, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_passport_lux_gender() {
        let (d, _) = parse(SAMPLE_PASSPORT_LUX, &DocumentType::Passport);
        assert_eq!(d.gender.as_deref(), Some("F"));
    }

    // ── Document type detection ───────────────────────────────────────────────
    #[test]
    fn test_detect_passport_from_mrz() {
        let text = "P<AUSCITIZEN<<JANE<<<<<<\nPA09404097AUS8406077F1903212\n";
        assert_eq!(detect_document_type(text), Some(DocumentType::Passport));
    }

    #[test]
    fn test_detect_nie_from_xy_number() {
        let text = "APELLIDOS\nGARCIA\nNIE X1234567B\n";
        assert_eq!(detect_document_type(text), Some(DocumentType::Nie));
    }

    #[test]
    fn test_detect_dni_from_keyword() {
        let text = "DOCUMENTO NACIONAL DE IDENTIDAD\nAPELLIDOS\nRONCERO\nDNI 12345678A\n";
        assert_eq!(detect_document_type(text), Some(DocumentType::Dni));
    }

    // ── extract_validez unit tests ────────────────────────────────────────────
    #[test]
    fn test_extract_validez_next_line() {
        let text = "NUM SOPORTE           VALIDEZ\nBKK114836             03  09  2029\n";
        let result = extract_validez(&text.to_uppercase());
        assert_eq!(
            result.as_deref(),
            Some("2029-09-03"),
            "VALIDEZ next-line should be 2029-09-03, got {:?}",
            result
        );
    }

    #[test]
    fn test_extract_validez_emision_second_date() {
        let text = "EMISION       VALIDEZ\n25 03 2022    25 03 2027\n";
        let result = extract_validez(&text.to_uppercase());
        assert_eq!(
            result.as_deref(),
            Some("2027-03-25"),
            "EMISION+VALIDEZ expiry should be second date 2027-03-25, got {:?}",
            result
        );
    }

    // ── parse_mrz_names unit tests ────────────────────────────────────────────

    #[test]
    fn test_mrz_names_single_surname_given() {
        // Standard: CITIZEN<<JANE = surname CITIZEN, given JANE
        let (ln, ln2, fn_) = parse_mrz_names("CITIZEN<<JANE<<<<<<<<<<<<<<<<<<<<<<<<");
        assert_eq!(ln.as_deref(), Some("CITIZEN"));
        assert_eq!(ln2, None);
        assert_eq!(fn_.as_deref(), Some("JANE"));
    }

    #[test]
    fn test_mrz_names_two_spanish_surnames() {
        // Spanish passport: GARCIA<LOPEZ<<MARIA<CARMEN
        let (ln, ln2, fn_) = parse_mrz_names("GARCIA<LOPEZ<<MARIA<CARMEN<<<<<<<<<<<");
        assert_eq!(ln.as_deref(), Some("GARCIA"));
        assert_eq!(ln2.as_deref(), Some("LOPEZ"));
        assert_eq!(fn_.as_deref(), Some("MARIA CARMEN"));
    }

    #[test]
    fn test_mrz_names_no_double_separator() {
        // Only surname, no given name section
        let (ln, ln2, fn_) = parse_mrz_names("SPECIMEN<<<<<<<<<<<<<<<<<<<<<<<<<");
        assert_eq!(ln.as_deref(), Some("SPECIMEN"));
        assert_eq!(ln2, None);
        assert_eq!(fn_, None);
    }

    // ── TD3 check digit validation tests ─────────────────────────────────────

    #[test]
    fn test_check_digit_aus_doc_number() {
        // PA0940409 → check 7 (from AUS specimen)
        assert_eq!(calculate_check_digit("PA0940409"), 7);
    }

    #[test]
    fn test_check_digit_aus_dob() {
        // 840607 → check 7
        assert_eq!(calculate_check_digit("840607"), 7);
    }

    #[test]
    fn test_check_digit_aus_expiry() {
        // 190321 → check 2
        assert_eq!(calculate_check_digit("190321"), 2);
    }

    // ── Passport: Spanish two-surname specimen ────────────────────────────────
    // Simulates a Spanish passport with two surnames in the MRZ.
    //
    // Line 1 (44 chars):
    //   P<ESPGOMEZ<MARTIN<<GUILLERMO<JOSE<<<<<<<<<<
    //
    // Line 2 (44 chars) — field positions verified with ICAO 7-3-1 check digits:
    //   [0..9]  AB1234567  doc num
    //   [9]     1          doc check (calculate_check_digit("AB1234567") = 1)
    //   [10..13] ESP       nationality
    //   [13..19] 840903    DOB (1984-09-03)
    //   [19]    4          DOB check (calculate_check_digit("840903") = 4)
    //   [20]    M          sex
    //   [21..27] 290903    expiry (2029-09-03)
    //   [27]    7          expiry check (calculate_check_digit("290903") = 7)
    //   [28..42] <<<<<<<<<<<<<<  personal data (14 fillers)
    //   [42]    0          personal check (all fillers = 0)
    //   [43]    6          composite check
    const SAMPLE_PASSPORT_ESP: &str = "\
PASAPORTE\n\
ESPANA\n\
DOCUMENTO No AB1234567\n\
Apellidos GOMEZ MARTIN\n\
Nombre GUILLERMO JOSE\n\
Nacionalidad ESP\n\
Fecha de nacimiento 03 SEP 1984\n\
Sexo M\n\
Fecha de caducidad 03 SEP 2029\n\
P<ESPGOMEZ<MARTIN<<GUILLERMO<JOSE<<<<<<<<<<\n\
AB12345671ESP8409034M2909037<<<<<<<<<<<<<<06\n";

    #[test]
    fn test_passport_esp_surnames_from_mrz() {
        let (d, _) = parse(SAMPLE_PASSPORT_ESP, &DocumentType::Passport);
        assert_eq!(
            d.last_name.as_deref(),
            Some("GOMEZ"),
            "First surname from MRZ should be GOMEZ, got {:?}",
            d.last_name
        );
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("MARTIN"),
            "Second surname from MRZ should be MARTIN, got {:?}",
            d.second_last_name
        );
    }

    #[test]
    fn test_passport_esp_given_name_from_mrz() {
        let (d, _) = parse(SAMPLE_PASSPORT_ESP, &DocumentType::Passport);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(
            name.contains("GUILLERMO"),
            "Given name should contain GUILLERMO, got: {name}"
        );
    }

    #[test]
    fn test_passport_esp_dob_from_mrz() {
        let (d, _) = parse(SAMPLE_PASSPORT_ESP, &DocumentType::Passport);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("1984-09-03"),
            "DOB should be 1984-09-03, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_passport_esp_expiry_from_mrz() {
        let (d, _) = parse(SAMPLE_PASSPORT_ESP, &DocumentType::Passport);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2029-09-03"),
            "Expiry should be 2029-09-03, got {:?}",
            d.expiry_date
        );
    }

    #[test]
    fn test_passport_esp_gender_and_nationality() {
        let (d, _) = parse(SAMPLE_PASSPORT_ESP, &DocumentType::Passport);
        assert_eq!(d.gender.as_deref(), Some("M"));
        assert_eq!(d.nationality.as_deref(), Some("ESP"));
    }

    // ── extract_sex_nationality unit tests ────────────────────────────────────
    #[test]
    fn test_extract_sex_nationality_m_esp() {
        let text = "SEXO           NACIONALIDAD\nM              ESP\n";
        let (gender, nat) = extract_sex_nationality(&text.to_uppercase());
        assert_eq!(gender.as_deref(), Some("M"));
        assert_eq!(nat.as_deref(), Some("ESP"));
    }

    #[test]
    fn test_extract_sex_nationality_f_arg() {
        let text = "SEXO/SEX   NACIONALIDAD/NATIONALITY\nF          ARG\n";
        let (gender, nat) = extract_sex_nationality(&text.to_uppercase());
        assert_eq!(gender.as_deref(), Some("F"));
        assert_eq!(nat.as_deref(), Some("ARG"));
    }

    // ── DNI: Sara Guevara Orti — Catalan bilingual front ─────────────────────
    //
    // Real DNI card with Catalan bilingual labels on front.
    // Key challenge: EMISIÓN label contains Ó (U+00D3, not plain ASCII O).
    // Catalan VALIDEZ equivalent: VALIDESA
    //
    //   DNI: 77023455C
    //   Apellido 1: GUEVARA   Apellido 2: ORTI
    //   Nombre: SARA
    //   Sexo: F   Nac: ESP   Nacimiento: 30-01-2007
    //   Emisión: 14-07-2022   Validez: 14-07-2027
    //   Núm. soporte: CCY161280
    //
    // The Ó in EMISIÓN is U+00D3 — Tesseract preserves it on modern DNIs.
    const SAMPLE_DNI_SARA_FRONT: &str = "\
REINO DE ESPA\u{00D1}A\n\
DOCUMENTO NACIONAL DE IDENTIDAD\n\
77023455C               DNI 77023455C    CCY161280\n\
APELLIDOS / COGNOMS\n\
GUEVARA\n\
ORTI\n\
NOMBRE / NOM\n\
SARA\n\
SEXO / SEXE  NACIONALIDAD / NACIONALITAT  NACIMIENTO / DATA DE NAIXEMENT\n\
F            ESP                           30 01 2007\n\
EMISI\u{00D3}N / EMISSI\u{00D3}    VALIDESA\n\
14 07 2022   14 07 2027\n\
NUM SOPORTE / N\u{00DA}M SUPORT\n\
CCY161280\n\
NATIONAL IDENTITY CARD / DOCUMENT NACIONAL D'IDENTITAT\n";

    #[test]
    fn test_sara_dni_number() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.document_number.as_deref(),
            Some("77023455C"),
            "DNI number should be 77023455C, got {:?}",
            d.document_number
        );
    }

    #[test]
    fn test_sara_first_surname() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.last_name.as_deref(),
            Some("GUEVARA"),
            "Primer apellido should be GUEVARA, got {:?}",
            d.last_name
        );
    }

    #[test]
    fn test_sara_second_surname() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("ORTI"),
            "Segundo apellido should be ORTI, got {:?}",
            d.second_last_name
        );
    }

    #[test]
    fn test_sara_first_name() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.first_name.as_deref(),
            Some("SARA"),
            "Nombre should be SARA, got {:?}",
            d.first_name
        );
    }

    #[test]
    fn test_sara_gender_female() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.gender.as_deref(),
            Some("F"),
            "Gender should be F, got {:?}",
            d.gender
        );
    }

    #[test]
    fn test_sara_nationality_esp() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.nationality.as_deref(),
            Some("ESP"),
            "Nationality should be ESP, got {:?}",
            d.nationality
        );
    }

    #[test]
    fn test_sara_dob() {
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("2007-01-30"),
            "DOB should be 2007-01-30, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_sara_expiry_date_catalan_emision() {
        // Catalan bilingual: "EMISIÓN / EMISSIÓ  VALIDESA\n14 07 2022  14 07 2027"
        // Expiry is the SECOND date (14 07 2027 → 2027-07-14).
        // The Ó in EMISIÓN (U+00D3) must be handled by extract_validez.
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2027-07-14"),
            "Expiry should be 2027-07-14, got {:?}",
            d.expiry_date
        );
    }

    #[test]
    fn test_sara_dob_not_emision() {
        // Must NOT pick up 2022-07-14 (issue date) as DOB
        let (d, _) = parse(SAMPLE_DNI_SARA_FRONT, &DocumentType::Dni);
        assert_ne!(
            d.date_of_birth.as_deref(),
            Some("2022-07-14"),
            "DOB must not be the EMISIÓN date 2022-07-14"
        );
    }

    // ── extract_validez unit test: EMISIÓN accent ─────────────────────────────

    #[test]
    fn test_extract_validez_emision_accent_catalan() {
        // Simulates Catalan bilingual DNI where EMISIÓN contains U+00D3 (Ó)
        // and VALIDEZ is written as VALIDESA.
        let text = "EMISI\u{00D3}N / EMISSI\u{00D3}    VALIDESA\n14 07 2022   14 07 2027\n";
        let upper = text.to_uppercase();
        let result = extract_validez(&upper);
        assert_eq!(
            result.as_deref(),
            Some("2027-07-14"),
            "Catalan EMISIÓN+VALIDESA: expiry should be 2027-07-14, got {:?}",
            result
        );
    }

    // ── DNI back side: Sara Guevara Orti (TD1 MRZ + DOMICILIO address) ────────
    //
    // TD1 MRZ (3 × 30 chars, Spanish DNI back):
    //   Line 1: IDESPCCY161280877023455C<<<<<<
    //     - ID = document type "ID"
    //     - ESP = issuing country
    //     - CCY161280 = soporte/document number (9 chars), check=8 ✓
    //     - 77023455C<<<<<< = optional data (DNI number padded)
    //   Line 2: 0701307F2707141ESP<<<<<<<<<<5
    //     - 070130 = DOB (2007-01-30), check=7 ✓
    //     - F = sex
    //     - 270714 = expiry (2027-07-14), check=1 ✓
    //     - ESP = nationality
    //     - <<<<<<<<<<<  = optional (11 fillers)
    //     - 5 = composite check
    //   Line 3: GUEVARA<ORTI<<SARA<<<<<<<<<<<<
    //     → last_name=GUEVARA, second_last_name=ORTI, first_name=SARA
    //
    // DOMICILIO section appears above the MRZ on the back card.
    const SAMPLE_DNI_SARA_BACK: &str = "\
DOMICILIO / DOMICILI\n\
CL PAU CASALS 12 2 1\n\
08031 BARCELONA\n\
MUNICIPIO\n\
BARCELONA\n\
IDESPCCY161280877023455C<<<<<<\n\
0701307F2707141ESP<<<<<<<<<<5\n\
GUEVARA<ORTI<<SARA<<<<<<<<<<<<\n";

    #[test]
    fn test_sara_back_mrz_dob() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        assert_eq!(
            d.date_of_birth.as_deref(),
            Some("2007-01-30"),
            "MRZ DOB should be 2007-01-30, got {:?}",
            d.date_of_birth
        );
    }

    #[test]
    fn test_sara_back_mrz_expiry() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        assert_eq!(
            d.expiry_date.as_deref(),
            Some("2027-07-14"),
            "MRZ expiry should be 2027-07-14, got {:?}",
            d.expiry_date
        );
    }

    #[test]
    fn test_sara_back_mrz_surnames() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        assert_eq!(
            d.last_name.as_deref(),
            Some("GUEVARA"),
            "MRZ ap1 should be GUEVARA, got {:?}",
            d.last_name
        );
        assert_eq!(
            d.second_last_name.as_deref(),
            Some("ORTI"),
            "MRZ ap2 should be ORTI, got {:?}",
            d.second_last_name
        );
    }

    #[test]
    fn test_sara_back_mrz_given_name() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        let name = d.first_name.as_deref().unwrap_or("");
        assert!(
            name.contains("SARA"),
            "MRZ given name should contain SARA, got: {name}"
        );
    }

    #[test]
    fn test_sara_back_mrz_nationality() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        assert_eq!(
            d.nationality.as_deref(),
            Some("ESP"),
            "MRZ nationality should be ESP, got {:?}",
            d.nationality
        );
    }

    #[test]
    fn test_sara_back_home_address_extracted() {
        let (d, _) = parse(SAMPLE_DNI_SARA_BACK, &DocumentType::Dni);
        let addr = d.home_address.as_deref().unwrap_or("");
        assert!(
            addr.contains("PAU CASALS") || addr.contains("08031"),
            "Home address should contain street or postal code, got: {:?}",
            d.home_address
        );
    }

    // ── extract_home_address unit tests ───────────────────────────────────────

    #[test]
    fn test_extract_home_address_basic() {
        let text = "DOMICILIO\nCL MAYOR 1 2D\n28001 MADRID\nMUNICIPIO\nMADRID\n";
        let addr = extract_home_address(text);
        let addr_str = addr.as_deref().unwrap_or("");
        assert!(
            addr_str.contains("MAYOR") || addr_str.contains("28001"),
            "Address should contain street or postal code, got: {:?}",
            addr
        );
    }

    #[test]
    fn test_extract_home_address_catalan_bilingual() {
        let text = "DOMICILIO / DOMICILI\nCL PAU CASALS 12 2 1\n08031 BARCELONA\nMUNICIPIO\n";
        let addr = extract_home_address(text);
        let addr_str = addr.as_deref().unwrap_or("");
        assert!(
            addr_str.contains("PAU CASALS"),
            "Catalan bilingual address should contain street, got: {:?}",
            addr
        );
    }

    #[test]
    fn test_extract_home_address_stops_at_mrz() {
        // MRZ-like lines (all caps + digits + '<') must not be included in address
        let text = "DOMICILIO\nCL GRAN VIA 5\nIDESPABC123456789ABC1234567890\n";
        let addr = extract_home_address(text);
        let addr_str = addr.as_deref().unwrap_or("");
        assert!(
            !addr_str.contains("IDESPAB"),
            "Address should not include MRZ lines, got: {:?}",
            addr
        );
    }
}
