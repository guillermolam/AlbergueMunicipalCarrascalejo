//! Spatial field binder — maps raw OCR text regions to structured document fields.
//!
//! Both Tesseract (text blob) and retto/PP-OCR (bbox list) feed into this layer.
//! The binder is the only place that knows about document-type-specific layout;
//! the OCR engines are treated as interchangeable black boxes.
//!
//! ## Binding strategies (in priority order)
//!
//! 1. **MRZ positional** — works for ALL passports, ALL countries, ALL scripts.
//!    ICAO 9303 mandates ASCII OCR-B regardless of national language.
//!    Bottom ~15% of image, 2×44 chars (TD3) or 3×30 chars (TD1).
//!
//! 2. **EU numbered field codes** — EU driving licences (Directive 2006/126/EC)
//!    and EU national ID cards use numeric field labels: 1=surname, 2=given name,
//!    3=DOB, 4a=issue date, 4b=expiry, 4c=authority, 4d=doc number, 5=national ID.
//!
//! 3. **Label/keyword regex** — Spanish DNI / NIE, and many EU passports that
//!    print human-readable labels next to values (APELLIDOS, NOMBRE, SURNAME, etc.).
//!    Works for Latin-script documents; degrades gracefully for non-Latin.
//!
//! 4. **Bilingual slash pattern** — CJK passports (CHN, TWN, JPN, KOR) print
//!    values as `汉字/LATIN_TRANSLITERATION`.  We capture only the Latin half,
//!    which is in every ICAO-compliant document and readable by any OCR engine.
//!
//! 5. **MRZ-only fallback** — non-Latin documents where no label strategy works.
//!    Returns MRZ fields only; a warning is added to the response.

use crate::models::ExtractedData;
use crate::parser::{script_family_for_country, ScriptFamily};

/// A single text region returned by an OCR engine.
/// Coordinates are normalised to 0.0–1.0 of the image dimensions.
/// For Tesseract text-blob input, `x`, `y`, `w`, `h` are all 0.0 (no position).
#[derive(Debug, Clone)]
pub struct TextRegion {
    pub text: String,
    pub confidence: f32,
    /// Normalised left edge (0 = left of image)
    pub x: f32,
    /// Normalised top edge (0 = top of image)
    pub y: f32,
    /// Normalised width
    pub w: f32,
    /// Normalised height
    pub h: f32,
}

impl TextRegion {
    /// Build a no-position region (for Tesseract text-blob input).
    pub fn from_text(text: impl Into<String>, confidence: f32) -> Self {
        Self { text: text.into(), confidence, x: 0.0, y: 0.0, w: 0.0, h: 0.0 }
    }

    pub fn right(&self) -> f32 {
        self.x + self.w
    }
    pub fn bottom(&self) -> f32 {
        self.y + self.h
    }
    pub fn center_x(&self) -> f32 {
        self.x + self.w / 2.0
    }
    pub fn center_y(&self) -> f32 {
        self.y + self.h / 2.0
    }
}

/// Contextual hints passed to the binder alongside the raw text regions.
#[derive(Debug, Clone)]
pub struct BinderHints {
    /// The declared document type (from the caller / UI selection).
    pub declared_doc_type: String,
    /// Country detected from a prior MRZ parse (ISO 3166-1 alpha-3).
    /// When `Some`, the binder skips the country-detection step.
    pub issuing_country: Option<String>,
}

/// Full binder result — structured fields plus diagnostics.
#[derive(Debug, Default)]
pub struct BinderResult {
    pub data: ExtractedData,
    /// Binding strategy that produced the result.
    pub strategy_used: String,
    /// Script family determined for this document.
    pub script_family: String,
    /// Human-readable warnings (e.g. "visual fields unavailable for non-Latin script").
    pub warnings: Vec<String>,
    /// True when only MRZ data was available (visual fields were not extracted).
    pub mrz_only: bool,
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Bind a list of raw OCR text regions to structured document fields.
///
/// This is the only public API of this module.  Callers supply whatever regions
/// their OCR engine produced (retto bbox list, Tesseract text blob, etc.) and
/// receive a fully-bound `BinderResult` with warnings attached.
pub fn bind(regions: &[TextRegion], hints: &BinderHints) -> BinderResult {
    // ── Step 1: assemble all recognized text into one blob for MRZ scanning ──
    let full_text: String = regions
        .iter()
        .map(|r| r.text.as_str())
        .collect::<Vec<_>>()
        .join("\n");

    // ── Step 2: try MRZ parsing first (works for ALL passports) ──────────────
    // Re-use the existing MRZ-aware parser from parser.rs.
    if let Some(mrz_data) = try_mrz_binding(&full_text) {
        let issuing = mrz_data.country.clone()
            .or_else(|| hints.issuing_country.clone())
            .unwrap_or_else(|| "UNK".to_string());
        let script = script_family_for_country(&issuing);
        let mut warnings = Vec::new();

        if !script.visually_parseable() {
            warnings.push(format!(
                "Issuing country {issuing} uses {} script. \
                 Visual fields are not extracted; MRZ data is complete.",
                script.as_str()
            ));
            if let Some(lang) = script.suggested_tesseract_lang() {
                warnings.push(format!(
                    "To enable visual field extraction for this script, \
                     add Tesseract language data: {lang}"
                ));
            }
            return BinderResult {
                data: mrz_data,
                strategy_used: "mrz_only".into(),
                script_family: script.as_str().into(),
                warnings,
                mrz_only: true,
            };
        }

        // Latin-script passport: MRZ gave us the core fields; try to supplement
        // with visual fields from the detected regions.
        let visual = try_eu_numbered_fields(regions, &full_text)
            .or_else(|| try_label_keyword_binding(regions, &full_text))
            .or_else(|| try_bilingual_slash_binding(regions, &full_text));

        let merged = if let Some(vis) = visual {
            merge_mrz_and_visual(mrz_data, vis)
        } else {
            mrz_data
        };

        return BinderResult {
            data: merged,
            strategy_used: "mrz_plus_visual".into(),
            script_family: script.as_str().into(),
            warnings,
            mrz_only: false,
        };
    }

    // ── Step 3: EU numbered field code binding (driving licence + some EU IDs) ─
    if let Some(data) = try_eu_numbered_fields(regions, &full_text) {
        return BinderResult {
            data,
            strategy_used: "eu_numbered_fields".into(),
            script_family: "latin".into(),
            warnings: Vec::new(),
            mrz_only: false,
        };
    }

    // ── Step 4: Label/keyword binding (Spanish DNI, NIE, many EU passports) ──
    if let Some(data) = try_label_keyword_binding(regions, &full_text) {
        return BinderResult {
            data,
            strategy_used: "label_keyword".into(),
            script_family: "latin".into(),
            warnings: Vec::new(),
            mrz_only: false,
        };
    }

    // ── Step 5: Bilingual slash pattern (CHN, JPN, KOR passports) ────────────
    if let Some(data) = try_bilingual_slash_binding(regions, &full_text) {
        return BinderResult {
            data,
            strategy_used: "bilingual_slash".into(),
            script_family: "cjk".into(),
            warnings: vec![
                "CJK passport: extracted Latin transliterations from bilingual fields. \
                 Chinese characters not parsed."
                    .into(),
            ],
            mrz_only: false,
        };
    }

    // ── Step 6: Nothing worked — return empty with a diagnostic ──────────────
    BinderResult {
        data: ExtractedData::default(),
        strategy_used: "none".into(),
        script_family: "unknown".into(),
        warnings: vec![
            "Could not extract fields from document. \
             Ensure the full document is visible, well-lit, and in focus."
                .into(),
        ],
        mrz_only: false,
    }
}

// ── Strategy implementations ──────────────────────────────────────────────────

/// Re-use the existing MRZ parser (both TD3 and TD1).
fn try_mrz_binding(text: &str) -> Option<ExtractedData> {
    use crate::models::DocumentType;
    use crate::parser::parse;
    let (data, confidence) = parse(text, &DocumentType::Passport);
    // Only accept if we got at least document number or name from MRZ
    if confidence > 0.0 && (data.document_number.is_some() || data.last_name.is_some()) {
        Some(data)
    } else {
        None
    }
}

/// EU Driving Licence / EU national ID numbered field binding.
///
/// EU Directive 2006/126/EC standardises field numbers on all EU driving licences:
///   1  → surname
///   2  → given name(s)
///   3  → date of birth  (DD.MM.YYYY or DD MM YYYY)
///   4a → date of issue
///   4b → date of expiry
///   4c → issuing authority
///   4d → document number (driving licence number)
///   5  → national identification number
///
/// The same numbering is used on many EU national ID cards (back side),
/// especially for "holder" fields.
///
/// Strategy:
///   a) Spatial: find a region whose text is "1", "2", "3", "4a"… then take
///      the nearest region to its right / below as the value.
///   b) Regex fallback on the full text blob for `^1\s+[A-Z]` patterns.
fn try_eu_numbered_fields(regions: &[TextRegion], full_text: &str) -> Option<ExtractedData> {
    // Detect presence of EU-numbered document structure
    let has_numbered = full_text.contains("\n1 ") || full_text.contains("\n1\n")
        || full_text.contains("\n2 ") || full_text.contains("\n2\n")
        || regex_find(r"(?m)^\s*1\s+[A-ZÁÉÍÓÚÑÜ]{2,}", full_text).is_some()
        || regex_find(r"(?m)^\s*2\s+[A-ZÁÉÍÓÚÑÜ]{2,}", full_text).is_some();

    if !has_numbered && !has_eu_numbered_labels(regions) {
        return None;
    }

    let mut data = ExtractedData::default();

    // ── Spatial binding (when bbox info is available) ─────────────────────────
    if regions.iter().any(|r| r.x > 0.0 || r.y > 0.0) {
        data.last_name = spatial_value_for_label(regions, &["1"], LookupDir::RightOrBelow);
        data.first_name = spatial_value_for_label(regions, &["2"], LookupDir::RightOrBelow);
        let dob_str = spatial_value_for_label(regions, &["3"], LookupDir::RightOrBelow);
        data.date_of_birth = dob_str.as_deref().and_then(parse_date_flexible);
        data.document_number = spatial_value_for_label(regions, &["4d", "4D"], LookupDir::RightOrBelow);
        let exp_str = spatial_value_for_label(regions, &["4b", "4B"], LookupDir::RightOrBelow);
        data.expiry_date = exp_str.as_deref().and_then(parse_date_flexible);
        let issue_str = spatial_value_for_label(regions, &["4a", "4A"], LookupDir::RightOrBelow);
        // issuing date not in ExtractedData, but used for confidence scoring
        let _ = issue_str;
    }

    // ── Regex fallback (Tesseract text blob, no bbox) ─────────────────────────
    if data.last_name.is_none() {
        // Pattern: line starting with "1" followed by an all-caps name
        data.last_name = regex_find(r"(?m)^\s*1[\s.]+([A-ZÁÉÍÓÚÑÜŽĖŪĄČŠĮ]{2,})", full_text);
    }
    if data.first_name.is_none() {
        data.first_name = regex_find(r"(?m)^\s*2[\s.]+([A-ZÁÉÍÓÚÑÜŽĖŪĄČŠĮ]{2,})", full_text);
    }
    if data.date_of_birth.is_none() {
        let raw = regex_find(r"(?m)^\s*3[\s.]+(\d{1,2}[.\s/\-]\d{1,2}[.\s/\-]\d{4})", full_text);
        data.date_of_birth = raw.as_deref().and_then(parse_date_flexible);
    }
    if data.document_number.is_none() {
        data.document_number = regex_find(r"(?m)^\s*4[dD][\s.]+([A-Z0-9]{5,20})", full_text);
    }
    if data.expiry_date.is_none() {
        let raw = regex_find(r"(?m)^\s*4[bB][\s.]+(\d{1,2}[.\s/\-]\d{1,2}[.\s/\-]\d{4})", full_text);
        data.expiry_date = raw.as_deref().and_then(parse_date_flexible);
    }

    // Country hint from "LIETUVOS RESPUBLIKA" → LTU, "ESPAÑA" → ESP, etc.
    if data.nationality.is_none() {
        data.nationality = detect_country_from_header(full_text);
    }

    if data.last_name.is_some() || data.document_number.is_some() {
        Some(data)
    } else {
        None
    }
}

/// Label/keyword binding — Spanish DNI, NIE, many EU passports with printed labels.
/// This re-uses the existing `parser::parse` logic but returns only the fields;
/// future work can make this take bounding-box positions into account.
fn try_label_keyword_binding(_regions: &[TextRegion], full_text: &str) -> Option<ExtractedData> {
    use crate::parser::{detect_document_type, parse};
    let doc_type = detect_document_type(full_text)?;
    let (data, confidence) = parse(full_text, &doc_type);
    if confidence > 0.3 && (data.last_name.is_some() || data.document_number.is_some()) {
        Some(data)
    } else {
        None
    }
}

/// Bilingual slash binding: extracts the Latin half of `汉字/LATIN` field values.
///
/// Chinese, Japanese, Korean (and some other Asian) passports print field values
/// as `<native script>/<Latin transliteration>`.  Since the Latin part follows
/// the `/` separator, standard Tesseract (Latin) can read it even without CJK
/// language data.
///
/// Examples from CNH passport:
///   `黄/HUANG`     → last_name  = "HUANG"
///   `恩/EN`         → first_name = "EN"
///   `女/F`          → gender     = "F"
fn try_bilingual_slash_binding(_regions: &[TextRegion], full_text: &str) -> Option<ExtractedData> {
    // Heuristic: at least one `CJK/<LATIN>` pattern must be present
    if !full_text
        .chars()
        .any(|c| ('\u{3000}'..='\u{9FFF}').contains(&c))
    {
        // No CJK characters detected in the OCR output — not a CJK document.
        // (Tesseract without CJK language data will drop them anyway, so we also
        // look for the bilingual format without requiring actual CJK chars.)
        let has_slash_pattern = regex_find(r"[A-Z]{2,}/[A-Z]{2,}", full_text).is_some();
        if !has_slash_pattern {
            return None;
        }
    }

    let mut data = ExtractedData::default();

    // Surname: look for `Surname` label context, then `?/CAPS`
    // The EU-standard bilingual label is `姓 / Surname` or just `Surname`
    let surname_ctx = regex_find(
        r"(?i)(?:surname|姓)[^\n]*\n[^\n/]*/([A-Z]{2,})",
        full_text,
    )
    .or_else(|| regex_find(r"(?i)1[^\n]*/([A-Z]{2,})", full_text));
    data.last_name = surname_ctx;

    // Given name
    let given_ctx = regex_find(
        r"(?i)(?:given\s*name|名)[^\n]*\n[^\n/]*/([A-Z]{2,})",
        full_text,
    )
    .or_else(|| regex_find(r"(?i)2[^\n]*/([A-Z]{2,})", full_text));
    data.first_name = given_ctx;

    // Gender from `女/F` or `男/M`
    data.gender = regex_find(r"/([MF])\b", full_text);

    // Dates remain in Latin format (07 JUL 1986) — try passport date parser
    data.date_of_birth = regex_find(
        r"(?i)(?:date\s+of\s+birth|出生日期)[^\n]*\n(\d{2}\s+[A-Z]{3}\s+\d{4})",
        full_text,
    )
    .as_deref()
    .and_then(parse_date_flexible);

    data.expiry_date = regex_find(
        r"(?i)(?:date\s+of\s+expir|有效期)[^\n]*\n(\d{2}\s+[A-Z]{3}\s+\d{4})",
        full_text,
    )
    .as_deref()
    .and_then(parse_date_flexible);

    // Document number: alphanumeric, often labelled `护照号/Passport No.`
    data.document_number = regex_find(
        r"(?i)(?:passport\s*no|护照号)[^\n]*\n([A-Z]\d{8,9})",
        full_text,
    )
    .or_else(|| regex_find(r"\b([A-Z]\d{8})\b", full_text));

    // Country code from `国家码/Country Code` line or MRZ position
    data.nationality = regex_find(r"(?i)country\s*cod[e]?[^\n]*\n([A-Z]{3})", full_text)
        .or_else(|| regex_find(r"\b(CHN|TWN|JPN|KOR|HKG|MAC)\b", full_text));

    data.document_type = Some("PASSPORT".into());

    if data.last_name.is_some() || data.document_number.is_some() {
        Some(data)
    } else {
        None
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Merge MRZ-derived data with visually-extracted data.
/// MRZ wins for dates and document number (more reliable); visual wins for names.
fn merge_mrz_and_visual(mrz: ExtractedData, visual: ExtractedData) -> ExtractedData {
    ExtractedData {
        document_number: mrz.document_number.or(visual.document_number),
        first_name: visual.first_name.or(mrz.first_name),
        last_name: visual.last_name.or(mrz.last_name),
        second_last_name: visual.second_last_name.or(mrz.second_last_name),
        middle_name: visual.middle_name.or(mrz.middle_name),
        document_type: mrz.document_type.or(visual.document_type),
        nationality: mrz.nationality.or(visual.nationality),
        date_of_birth: mrz.date_of_birth.or(visual.date_of_birth),
        expiry_date: mrz.expiry_date.or(visual.expiry_date),
        gender: mrz.gender.or(visual.gender),
        home_address: visual.home_address,
        country: mrz.country.or(visual.country),
        has_photo: mrz.has_photo || visual.has_photo,
    }
}

/// Direction preference when looking for a label's value in spatial binder.
enum LookupDir {
    RightOrBelow,
}

/// Find the value text region nearest to a label region (to its right, or below).
fn spatial_value_for_label(
    regions: &[TextRegion],
    labels: &[&str],
    _dir: LookupDir,
) -> Option<String> {
    // Find label region
    let label_region = regions.iter().find(|r| {
        labels.iter().any(|&l| r.text.trim().eq_ignore_ascii_case(l))
    })?;

    // Find the closest region that is to the right of (or just below) the label
    let value = regions
        .iter()
        .filter(|r| {
            // Must not be the label itself
            !labels.iter().any(|&l| r.text.trim().eq_ignore_ascii_case(l))
            // Must be to the right or below
            && (r.center_x() > label_region.right() || r.center_y() > label_region.bottom())
            // Within 2× the label height of the label center (nearby)
            && (r.center_y() - label_region.center_y()).abs() < label_region.h * 3.0
            // Must have meaningful text
            && r.text.trim().len() >= 2
        })
        .min_by(|a, b| {
            // Score: prefer right-of-label (same row) over below
            let dist_a = horizontal_then_vertical_dist(label_region, a);
            let dist_b = horizontal_then_vertical_dist(label_region, b);
            dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
        });

    value.map(|r| r.text.trim().to_string())
}

fn horizontal_then_vertical_dist(label: &TextRegion, candidate: &TextRegion) -> f32 {
    let dx = (candidate.center_x() - label.right()).max(0.0);
    let dy = (candidate.center_y() - label.center_y()).abs();
    // Weight horizontal distance less than vertical so right-of-label wins
    dx + dy * 2.0
}

/// Check if any detected text region looks like an EU field label ("1", "2", "4a"…).
fn has_eu_numbered_labels(regions: &[TextRegion]) -> bool {
    let eu_labels = ["1", "2", "3", "4a", "4b", "4c", "4d", "5"];
    let count = regions
        .iter()
        .filter(|r| eu_labels.contains(&r.text.trim()))
        .count();
    count >= 2
}

/// Detect country from document header text (e.g. "LIETUVOS RESPUBLIKA" → "LTU").
fn detect_country_from_header(text: &str) -> Option<String> {
    let upper = text.to_uppercase();
    // Map of header substrings to ISO 3166-1 alpha-3 codes
    let headers: &[(&str, &str)] = &[
        ("LIETUV", "LTU"),
        ("LATVIJ", "LVA"),
        ("EESTI", "EST"),
        ("POLSKA", "POL"),
        ("CZECHIA", "CZE"),
        ("SLOVENSKO", "SVK"),
        ("MAGYARORSZ", "HUN"),
        ("ROMANIA", "ROU"),
        ("HRVATSKA", "HRV"),
        ("SLOVENIJA", "SVN"),
        ("ESPANA", "ESP"),
        ("ESPAÑA", "ESP"),
        ("PORTUGAL", "PRT"),
        ("FRANCE", "FRA"),
        ("DEUTSCHLAND", "DEU"),
        ("ITALIA", "ITA"),
        ("BELGIQUE", "BEL"),
        ("NEDERLAND", "NLD"),
        ("AUSTRIA", "AUT"),
        ("SVERIGE", "SWE"),
        ("SUOMI", "FIN"),
        ("IRELAND", "IRL"),
        ("GREECE", "GRC"),
        ("BULGARIA", "BGR"),
        ("UNITED KINGDOM", "GBR"),
        ("SCHWEIZ", "CHE"),
        ("NORWAY", "NOR"),
        ("DENMARK", "DNK"),
        ("CHINA", "CHN"),
        ("JAPAN", "JPN"),
    ];
    for (fragment, code) in headers {
        if upper.contains(fragment) {
            return Some(code.to_string());
        }
    }
    None
}

/// Flexible date parser — handles multiple formats seen across EU documents:
///   DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY, DD MMM YYYY
fn parse_date_flexible(s: &str) -> Option<String> {
    // DD MMM YYYY (e.g. "07 JUL 1986")
    if let Some(d) = parse_dmy_alpha(s) {
        return Some(d);
    }
    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY or DD MM YYYY
    let re = regex::Regex::new(r"(\d{1,2})[.\s/\-](\d{1,2})[.\s/\-](\d{4})").ok()?;
    if let Some(caps) = re.captures(s) {
        let day: u32 = caps[1].parse().ok()?;
        let month: u32 = caps[2].parse().ok()?;
        let year: i32 = caps[3].parse().ok()?;
        if (1..=31).contains(&day) && (1..=12).contains(&month) && year > 1900 {
            return Some(format!("{year:04}-{month:02}-{day:02}"));
        }
    }
    None
}

/// Parse "DD MMM YYYY" (e.g. "07 JUL 1986") → "YYYY-MM-DD".
fn parse_dmy_alpha(s: &str) -> Option<String> {
    let re =
        regex::Regex::new(r"(\d{1,2})\s+([A-Z]{3})\s+(\d{4})").ok()?;
    let upper = s.to_uppercase();
    let caps = re.captures(&upper)?;
    let day: u32 = caps[1].parse().ok()?;
    let month_str = &caps[2];
    let year: i32 = caps[3].parse().ok()?;
    let month = match month_str {
        "JAN" => 1, "FEB" => 2, "MAR" => 3, "APR" => 4,
        "MAY" => 5, "JUN" => 6, "JUL" => 7, "AUG" => 8,
        "SEP" => 9, "OCT" => 10, "NOV" => 11, "DEC" => 12,
        _ => return None,
    };
    Some(format!("{year:04}-{month:02}-{day:02}"))
}

/// Compile-once regex search helper.
fn regex_find(pattern: &str, text: &str) -> Option<String> {
    regex::Regex::new(pattern)
        .ok()?
        .captures(text)?
        .get(1)
        .map(|m| m.as_str().trim().to_string())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn r(text: &str, x: f32, y: f32, w: f32, h: f32) -> TextRegion {
        TextRegion { text: text.to_string(), confidence: 0.99, x, y, w, h }
    }

    // ── EU numbered field binding ─────────────────────────────────────────────

    #[test]
    fn test_eu_numbered_fields_from_text_blob() {
        let text = "\nVAIRUOTOJO PAZYMEJIMAS\nLIETUVOS RESPUBLIKA\n\
                    1 BASANAVICIENE\n2 BIRUTE\n3 23.12.1959\n4b 01.11.2015\n4d 45911231023\n";
        let regions = vec![TextRegion::from_text(text, 0.95)];
        let hints = BinderHints {
            declared_doc_type: "driving_licence".into(),
            issuing_country: Some("LTU".into()),
        };
        let result = bind(&regions, &hints);
        assert_eq!(result.data.last_name.as_deref(), Some("BASANAVICIENE"));
        assert_eq!(result.data.first_name.as_deref(), Some("BIRUTE"));
        assert_eq!(result.data.date_of_birth.as_deref(), Some("1959-12-23"));
        assert_eq!(result.data.document_number.as_deref(), Some("45911231023"));
    }

    #[test]
    fn test_eu_numbered_fields_spatial() {
        // Simulate bbox output from retto: label on left, value on right
        let regions = vec![
            r("1", 0.30, 0.40, 0.02, 0.05),
            r("BASANAVICIENE", 0.35, 0.40, 0.25, 0.05),
            r("2", 0.30, 0.47, 0.02, 0.05),
            r("BIRUTE", 0.35, 0.47, 0.15, 0.05),
            r("4d", 0.30, 0.54, 0.04, 0.05),
            r("45911231023", 0.36, 0.54, 0.20, 0.05),
        ];
        let hints = BinderHints {
            declared_doc_type: "driving_licence".into(),
            issuing_country: Some("LTU".into()),
        };
        let result = bind(&regions, &hints);
        assert_eq!(result.strategy_used, "eu_numbered_fields");
        assert_eq!(result.data.last_name.as_deref(), Some("BASANAVICIENE"));
        assert_eq!(result.data.first_name.as_deref(), Some("BIRUTE"));
        assert_eq!(result.data.document_number.as_deref(), Some("45911231023"));
    }

    // ── Bilingual slash binding ───────────────────────────────────────────────

    #[test]
    fn test_bilingual_slash_chinese_passport() {
        let text = "PASSPORT\nCountry Code\nCHN\nSurname\n黄/HUANG\nGiven name\n恩/EN\n\
                    Sex\n女/F\nDate of birth\n07 JUL 1986\nDate of expiry\n13 JAN 2020\n\
                    Passport No.\nG39575625\n\
                    POCHNHUANG<<EN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n\
                    G395756254CHN8607070F2001137192064O2<<<<<<46";
        let regions = vec![TextRegion::from_text(text, 0.95)];
        let hints = BinderHints {
            declared_doc_type: "passport".into(),
            issuing_country: Some("CHN".into()),
        };
        let result = bind(&regions, &hints);
        // MRZ parser should fire first and get complete data
        assert!(
            result.data.last_name.as_deref() == Some("HUANG")
                || result.data.document_number.is_some(),
            "Expected HUANG or document number, got: {:?}",
            result.data
        );
        assert_eq!(result.data.nationality.as_deref(), Some("CHN"));
    }

    // ── Date parsing ─────────────────────────────────────────────────────────

    #[test]
    fn test_parse_date_dmy_alpha() {
        assert_eq!(parse_date_flexible("07 JUL 1986"), Some("1986-07-07".into()));
        assert_eq!(parse_date_flexible("13 JAN 2020"), Some("2020-01-13".into()));
    }

    #[test]
    fn test_parse_date_dot_separated() {
        assert_eq!(parse_date_flexible("23.12.1959"), Some("1959-12-23".into()));
    }

    #[test]
    fn test_parse_date_slash_separated() {
        assert_eq!(parse_date_flexible("01/11/2015"), Some("2015-11-01".into()));
    }

    // ── Country detection from header ─────────────────────────────────────────

    #[test]
    fn test_detect_country_lietuva() {
        assert_eq!(
            detect_country_from_header("LIETUVOS RESPUBLIKA"),
            Some("LTU".into())
        );
    }

    #[test]
    fn test_detect_country_espana() {
        assert_eq!(
            detect_country_from_header("REINO DE ESPAÑA"),
            Some("ESP".into())
        );
    }

    // ── Script family ─────────────────────────────────────────────────────────

    #[test]
    fn test_script_family_cjk_chn() {
        assert_eq!(script_family_for_country("CHN"), ScriptFamily::Cjk);
        assert!(!script_family_for_country("CHN").visually_parseable());
    }

    #[test]
    fn test_script_family_latin_ltu() {
        assert_eq!(script_family_for_country("LTU"), ScriptFamily::Latin);
        assert!(script_family_for_country("LTU").visually_parseable());
    }

    #[test]
    fn test_script_family_arabic() {
        assert_eq!(script_family_for_country("SAU"), ScriptFamily::Arabic);
        assert_eq!(
            script_family_for_country("SAU").suggested_tesseract_lang(),
            Some("ara+fas")
        );
    }
}
