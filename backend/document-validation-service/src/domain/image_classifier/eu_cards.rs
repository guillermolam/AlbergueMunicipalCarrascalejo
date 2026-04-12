//! EU/EEA national ID card format catalog.
//!
//! Each entry encodes the machine-readable characteristics and visual cues
//! used for training a future CV classifier or for heuristic validation.
//!
//! MRZ format reference (ICAO Doc 9303):
//!   TD1 — 3 lines × 30 chars — used by most EU national ID cards
//!   TD2 — 2 lines × 36 chars — used by some older cards (Germany pre-2010)
//!   TD3 — 2 lines × 44 chars — used by passports and travel documents
//!
//! Physical dimensions (ISO/IEC 7810):
//!   ID-1: 85.60 × 53.98 mm (all EU national ID cards since 2021 EU regulation)
//!   ID-3: 125 × 88 mm (all biometric passports)
//!
//! Data sources:
//!   - ICAO Doc 9303 (Machine Readable Travel Documents)
//!   - EU Regulation 2019/1157 (security of national ID cards)
//!   - Individual country government publications
//!
//! # Training-data strategy
//!
//! To train a CNN classifier on top of these heuristics:
//!
//! 1. Collect labeled samples for each country via:
//!    - Wikipedia "National identity card (country)" pages (specimen images, usually watermarked)
//!    - PRADO (Council of the EU public register of authentic documents):
//!      https://www.consilium.europa.eu/prado/en/prado-start-page.html
//!    - Regulaforensics open test-card dataset (BSD license, 400+ cards):
//!      https://github.com/regulaforensics/DocumentReader-recipes
//!    - Synthetic generation using GAN conditioned on country label
//!
//! 2. Label each image: (country_code, side: front|back, is_passport: bool)
//!
//! 3. Train a MobileNetV3-Small (≈3 MB) or EfficientNet-Lite0 (≈4 MB) in TFLite,
//!    quantise to INT8 (≈1 MB), convert to ONNX.
//!
//! 4. Load the ONNX model in the Cloudflare Worker via `tract-onnx` (WASM-compatible):
//!    https://github.com/sonos/tract
//!    The quantised model + worker bundle must stay under Cloudflare's 10 MB limit.

use serde::{Deserialize, Serialize};

// ── MRZ format enum ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MrzFormat {
    /// 3 lines × 30 characters — standard for EU national ID cards
    Td1,
    /// 2 lines × 36 characters — some older EU ID cards
    Td2,
    /// 2 lines × 44 characters — biometric passports / travel documents
    Td3,
    /// No machine-readable zone
    None,
}

// ── Country card descriptor ──────────────────────────────────────────────────

/// Only `Serialize` (not `Deserialize`) — static data is never deserialized from JSON.
#[derive(Debug, Clone, Serialize)]
pub struct EuCountryCard {
    /// ISO 3166-1 alpha-2 country code (display / storage key)
    pub country_code: &'static str,
    /// ICAO 3-letter code used in the MRZ nationality field
    pub icao_code: &'static str,
    /// Country name in English
    pub name_en: &'static str,
    /// Whether the country issues a national ID card (distinct from passport)
    pub has_national_id: bool,
    /// Whether carrying the ID card is legally mandatory
    pub id_is_mandatory: bool,
    /// MRZ format used on the national ID card
    pub mrz_format: MrzFormat,
    /// Key visual features on the FRONT of the card (for OCR/CV cues)
    pub front_cues: &'static [&'static str],
    /// Key visual features on the BACK of the card (MRZ, barcodes, etc.)
    pub back_cues: &'static [&'static str],
    /// Dominant colour family on the card face (rough RGB hint for classifier)
    pub dominant_color_hint: (u8, u8, u8),
}

// ── Full EU/EEA country catalog ───────────────────────────────────────────────

/// All 27 EU member states + 4 EEA non-EU countries (IS, LI, NO, CH).
/// Denmark and Ireland do NOT issue national ID cards; citizens use passports.
pub static EU_COUNTRY_CARDS: &[EuCountryCard] = &[
    // ── EU member states ──────────────────────────────────────────────────────
    EuCountryCard {
        country_code: "AT",
        icao_code: "AUT",
        name_en: "Austria",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "Personalausweis",
            "Österreich",
            "Austrian eagle",
            "red-white-red stripe",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "municipality"],
        dominant_color_hint: (240, 235, 220),
    },
    EuCountryCard {
        country_code: "BE",
        icao_code: "BEL",
        name_en: "Belgium",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "Identiteitskaart/Carte d'identité/Personalausweis",
            "Belgique/België",
            "lion emblem",
            "CHIP",
        ],
        back_cues: &["TD1 MRZ 3×30", "National Registry Number", "municipality"],
        dominant_color_hint: (200, 215, 235),
    },
    EuCountryCard {
        country_code: "BG",
        icao_code: "BGR",
        name_en: "Bulgaria",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &["БЪЛГАРИЯ / BULGARIA", "ЛИЧНА КАРТА", "lion coat-of-arms"],
        back_cues: &["TD1 MRZ 3×30", "permanent address"],
        dominant_color_hint: (230, 230, 245),
    },
    EuCountryCard {
        country_code: "CY",
        icao_code: "CYP",
        name_en: "Cyprus",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "ΚΥΠΡΟΣ / KYPROS / CYPRUS",
            "ΔΕΛΤΊΟ ΤΑΥΤΌΤΗΤΑΣ",
            "copper map emblem",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (245, 240, 220),
    },
    EuCountryCard {
        country_code: "CZ",
        icao_code: "CZE",
        name_en: "Czechia",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &["ČESKÁ REPUBLIKA", "OBČANSKÝ PRŮKAZ", "Czech lion"],
        back_cues: &["TD1 MRZ 3×30", "address"],
        dominant_color_hint: (225, 235, 250),
    },
    EuCountryCard {
        country_code: "DE",
        icao_code: "D",
        name_en: "Germany",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "PERSONALAUSWEIS",
            "Bundesrepublik Deutschland",
            "German eagle",
            "EU stars",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "fingerprint zone"],
        dominant_color_hint: (240, 230, 200),
    },
    EuCountryCard {
        country_code: "DK",
        icao_code: "DNK",
        name_en: "Denmark",
        has_national_id: false,
        id_is_mandatory: false,
        mrz_format: MrzFormat::None,
        front_cues: &["No national ID card — uses passport"],
        back_cues: &[],
        dominant_color_hint: (255, 255, 255),
    },
    EuCountryCard {
        country_code: "EE",
        icao_code: "EST",
        name_en: "Estonia",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "EESTI",
            "ISIKUTUNNISTUS",
            "Estonian coat-of-arms (three blue lions)",
        ],
        back_cues: &["TD1 MRZ 3×30", "personal code"],
        dominant_color_hint: (230, 240, 255),
    },
    EuCountryCard {
        country_code: "ES",
        icao_code: "ESP",
        name_en: "Spain",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "DNI",
            "España",
            "DOCUMENTO NACIONAL DE IDENTIDAD",
            "red-yellow-red stripe",
            "Spanish coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "barcode", "fingerprint zone"],
        dominant_color_hint: (245, 240, 225),
    },
    EuCountryCard {
        country_code: "FI",
        icao_code: "FIN",
        name_en: "Finland",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "SUOMI / FINLAND",
            "HENKILÖKORTTI / IDENTITETSKORT",
            "Finnish lion",
        ],
        back_cues: &["TD1 MRZ 3×30", "personal identity code"],
        dominant_color_hint: (235, 245, 255),
    },
    EuCountryCard {
        country_code: "FR",
        icao_code: "FRA",
        name_en: "France",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "CARTE NATIONALE D'IDENTITÉ",
            "République Française",
            "Marianne",
            "French tricolore stripe",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "LISEZ / READ"],
        dominant_color_hint: (235, 235, 250),
    },
    EuCountryCard {
        country_code: "GR",
        icao_code: "GRC",
        name_en: "Greece",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ",
            "ΔΕΛΤΙΟ ΤΑΥΤΟΤΗΤΑΣ",
            "Greek coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (235, 240, 250),
    },
    EuCountryCard {
        country_code: "HR",
        icao_code: "HRV",
        name_en: "Croatia",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "HRVATSKA",
            "OSOBNA ISKAZNICA",
            "Croatian chessboard coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30", "address"],
        dominant_color_hint: (240, 235, 235),
    },
    EuCountryCard {
        country_code: "HU",
        icao_code: "HUN",
        name_en: "Hungary",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "MAGYARORSZÁG",
            "SZEMÉLYAZONOSÍTÓ IGAZOLVÁNY",
            "Hungarian coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30", "address"],
        dominant_color_hint: (245, 235, 235),
    },
    EuCountryCard {
        country_code: "IE",
        icao_code: "IRL",
        name_en: "Ireland",
        has_national_id: false,
        id_is_mandatory: false,
        mrz_format: MrzFormat::None,
        front_cues: &["No mandatory national ID card — uses passport / Public Services Card"],
        back_cues: &[],
        dominant_color_hint: (255, 255, 255),
    },
    EuCountryCard {
        country_code: "IT",
        icao_code: "ITA",
        name_en: "Italy",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "CARTA D'IDENTITÀ",
            "Repubblica Italiana",
            "Italian star / coat-of-arms",
            "EU flag",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "municipality"],
        dominant_color_hint: (230, 240, 255),
    },
    EuCountryCard {
        country_code: "LT",
        icao_code: "LTU",
        name_en: "Lithuania",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "LIETUVA",
            "ASMENS TAPATYBĖS KORTELĖ",
            "Vytis (knight) coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30", "personal number"],
        dominant_color_hint: (240, 240, 230),
    },
    EuCountryCard {
        country_code: "LU",
        icao_code: "LUX",
        name_en: "Luxembourg",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "LUXEMBOURG / LËTZEBUERG",
            "CARTE D'IDENTITÉ / PERSONALAUSWEIS",
            "red lion",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (230, 240, 250),
    },
    EuCountryCard {
        country_code: "LV",
        icao_code: "LVA",
        name_en: "Latvia",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &["LATVIJA", "PERSONAS APLIECĪBA", "Latvian coat-of-arms"],
        back_cues: &["TD1 MRZ 3×30", "personal identity code"],
        dominant_color_hint: (240, 235, 235),
    },
    EuCountryCard {
        country_code: "MT",
        icao_code: "MLT",
        name_en: "Malta",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "MALTA",
            "KARTA TAL-IDENTITÀ",
            "Maltese cross / George Cross",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (235, 235, 245),
    },
    EuCountryCard {
        country_code: "NL",
        icao_code: "NLD",
        name_en: "Netherlands",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "NEDERLAND",
            "IDENTITEITSKAART",
            "Dutch lion",
            "orange accent",
        ],
        back_cues: &["TD1 MRZ 3×30", "BSN (citizen service number)"],
        dominant_color_hint: (235, 240, 250),
    },
    EuCountryCard {
        country_code: "PL",
        icao_code: "POL",
        name_en: "Poland",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &["RZECZPOSPOLITA POLSKA", "DOWÓD OSOBISTY", "Polish eagle"],
        back_cues: &["TD1 MRZ 3×30", "address"],
        dominant_color_hint: (240, 235, 230),
    },
    EuCountryCard {
        country_code: "PT",
        icao_code: "PRT",
        name_en: "Portugal",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &["CARTÃO DE CIDADÃO", "Portugal", "Portuguese coat-of-arms"],
        back_cues: &["TD1 MRZ 3×30", "NIF (tax number)"],
        dominant_color_hint: (235, 240, 230),
    },
    EuCountryCard {
        country_code: "RO",
        icao_code: "ROU",
        name_en: "Romania",
        has_national_id: true,
        id_is_mandatory: true,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "ROMÂNIA",
            "CARTE DE IDENTITATE",
            "Romanian coat-of-arms (eagle with cross)",
        ],
        back_cues: &["TD1 MRZ 3×30", "CNP (personal numeric code)", "address"],
        dominant_color_hint: (240, 240, 235),
    },
    EuCountryCard {
        country_code: "SE",
        icao_code: "SWE",
        name_en: "Sweden",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "SVERIGE",
            "ID-KORT / IDENTITETSKORT",
            "three crowns emblem",
            "blue/yellow design",
        ],
        back_cues: &["TD1 MRZ 3×30", "personal identity number"],
        dominant_color_hint: (230, 240, 255),
    },
    EuCountryCard {
        country_code: "SI",
        icao_code: "SVN",
        name_en: "Slovenia",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "SLOVENIJA",
            "OSEBNA IZKAZNICA",
            "Slovenian coat-of-arms (Triglav + stars)",
        ],
        back_cues: &["TD1 MRZ 3×30", "address"],
        dominant_color_hint: (235, 240, 250),
    },
    EuCountryCard {
        country_code: "SK",
        icao_code: "SVK",
        name_en: "Slovakia",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "SLOVENSKÁ REPUBLIKA",
            "OBČIANSKY PREUKAZ",
            "Slovak double-cross shield",
        ],
        back_cues: &["TD1 MRZ 3×30", "address", "personal number"],
        dominant_color_hint: (235, 240, 240),
    },
    // ── EEA non-EU members ───────────────────────────────────────────────────
    EuCountryCard {
        country_code: "CH",
        icao_code: "CHE",
        name_en: "Switzerland",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "SCHWEIZ / SUISSE / SVIZZERA / SVIZRA",
            "IDENTITÄTSKARTE",
            "Swiss cross",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (240, 235, 235),
    },
    EuCountryCard {
        country_code: "IS",
        icao_code: "ISL",
        name_en: "Iceland",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &[
            "ÍSLAND",
            "NAFNSKÍRTEINI / IDENTITY CARD",
            "Icelandic coat-of-arms",
        ],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (235, 245, 255),
    },
    EuCountryCard {
        country_code: "LI",
        icao_code: "LIE",
        name_en: "Liechtenstein",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &["LIECHTENSTEIN", "IDENTITÄTSKARTE", "princely crown"],
        back_cues: &["TD1 MRZ 3×30"],
        dominant_color_hint: (240, 240, 250),
    },
    EuCountryCard {
        country_code: "NO",
        icao_code: "NOR",
        name_en: "Norway",
        has_national_id: true,
        id_is_mandatory: false,
        mrz_format: MrzFormat::Td1,
        front_cues: &["NORGE / NORWAY", "IDENTITETSKORT", "Norwegian lion"],
        back_cues: &["TD1 MRZ 3×30", "D-number / personal identity number"],
        dominant_color_hint: (235, 240, 255),
    },
];

// ── Look-up helpers ───────────────────────────────────────────────────────────

/// Find a card descriptor by ISO 3166-1 alpha-2 country code (case-insensitive).
pub fn find_by_country_code(code: &str) -> Option<&'static EuCountryCard> {
    let upper = code.to_ascii_uppercase();
    EU_COUNTRY_CARDS.iter().find(|c| c.country_code == upper)
}

/// Find a card descriptor by the ICAO 3-letter MRZ nationality field.
pub fn find_by_icao_code(icao: &str) -> Option<&'static EuCountryCard> {
    let upper = icao.to_ascii_uppercase();
    EU_COUNTRY_CARDS.iter().find(|c| c.icao_code == upper)
}

/// Return all countries that issue national ID cards with a MRZ zone.
pub fn cards_with_mrz() -> impl Iterator<Item = &'static EuCountryCard> {
    EU_COUNTRY_CARDS
        .iter()
        .filter(|c| c.has_national_id && !matches!(c.mrz_format, MrzFormat::None))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_spain() {
        let card = find_by_country_code("ES").unwrap();
        assert_eq!(card.icao_code, "ESP");
        assert!(card.id_is_mandatory);
        assert_eq!(card.mrz_format, MrzFormat::Td1);
        assert!(card.front_cues.iter().any(|c| c.contains("DNI")));
    }

    #[test]
    fn test_find_by_icao_germany() {
        let card = find_by_icao_code("D").unwrap();
        assert_eq!(card.country_code, "DE");
        assert!(card.has_national_id);
    }

    #[test]
    fn test_denmark_no_id_card() {
        let card = find_by_country_code("DK").unwrap();
        assert!(!card.has_national_id);
        assert_eq!(card.mrz_format, MrzFormat::None);
    }

    #[test]
    fn test_cards_with_mrz_count() {
        let count = cards_with_mrz().count();
        // At least 24 EU/EEA states issue MRZ-bearing ID cards
        assert!(count >= 24, "expected ≥24 MRZ cards, got {count}");
    }

    #[test]
    fn test_find_unknown_country() {
        assert!(find_by_country_code("XX").is_none());
        assert!(find_by_icao_code("XXX").is_none());
    }
}
