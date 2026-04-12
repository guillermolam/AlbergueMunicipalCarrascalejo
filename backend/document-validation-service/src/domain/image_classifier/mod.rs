//! Heuristic document-image classifier for EU/EEA national ID cards and passports.
//!
//! Uses the `image` crate (WASM-compatible, no C FFI) to perform pixel-level
//! analysis equivalent to what an OpenCV pipeline would do:
//!   1. Aspect-ratio test → portrait vs landscape → passport vs ID card
//!   2. MRZ zone scan   → high-contrast character rows in bottom 30%
//!   3. Photo-region    → skin-tone density in the left ≈35% strip
//!
//! The MRZ heuristic is inspired by the OpenCV Sobel + horizontal-projection
//! approach used in MRZ-detection literature (Zhu et al. 2014).

pub mod eu_cards;

use image::{DynamicImage, GenericImageView, GrayImage, ImageReader, RgbImage};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

// ── Public types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectedDocType {
    EuIdCard,
    Passport,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DetectedSide {
    /// Photo page (front) — landscape ID card or passport photo page
    Front,
    /// MRZ page (back) — TD1 / TD2 machine-readable zone on rear of ID card
    Back,
    Unknown,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClassificationResult {
    pub doc_type: DetectedDocType,
    pub side: DetectedSide,
    /// Overall confidence in the classification, 0.0–1.0
    pub confidence: f32,
    pub aspect_ratio: f32,
    pub has_mrz_zone: bool,
    /// Number of MRZ row bands detected (TD1 has 3, TD3 has 2)
    pub mrz_rows_detected: u8,
    pub has_photo_region: bool,
    /// Blue EU-flag rectangle detected in upper-left corner (front-face cue,
    /// per EU Regulation 2019/1157 mandatory on all EU national ID cards from 2021)
    pub has_eu_flag: bool,
    /// ICAO/ISO 3166 country hint if detected from MRZ text (requires OCR)
    pub country_hint: Option<String>,
    pub warnings: Vec<String>,
}

// ── Image-level limits (mirrors Cloudflare Images policy) ──────────────────

pub const CF_MAX_BYTES: usize = 10 * 1024 * 1024; // 10 MB
pub const CF_MAX_DIMENSION: u32 = 12_000; // px per side
pub const CF_MAX_AREA: u64 = 100_000_000; // 100 MP (100 × 10^6)

#[derive(Debug, Serialize, Deserialize)]
pub struct ImageValidationResult {
    pub format_valid: bool,
    pub size_valid: bool,
    pub dimensions_valid: bool,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub file_size_bytes: usize,
    pub errors: Vec<String>,
    pub classification: Option<ClassificationResult>,
}

// ── MIME / extension allow-list ──────────────────────────────────────────────

pub fn is_allowed_format(mime_type: &str) -> bool {
    matches!(
        mime_type,
        "image/jpeg"
            | "image/jpg"
            | "image/png"
            | "image/gif"
            | "image/webp"
            | "image/svg+xml"
            | "image/heic"
            | "image/heif"
    )
}

// ── Main entry point ─────────────────────────────────────────────────────────

pub struct EuIdClassifier;

impl EuIdClassifier {
    /// Validate and classify a document image from raw bytes.
    ///
    /// Returns an [`ImageValidationResult`] that includes Cloudflare limit checks
    /// AND a heuristic document-type / side classification.
    pub fn validate_and_classify(
        image_bytes: &[u8],
        mime_type: Option<&str>,
    ) -> ImageValidationResult {
        let file_size = image_bytes.len();
        let mut errors: Vec<String> = Vec::new();

        // 1. Format check
        let format_valid = mime_type.is_some_and(is_allowed_format);
        if !format_valid {
            errors.push(format!(
                "Unsupported format: '{}'.  Allowed: JPEG, PNG, GIF, WebP, SVG, HEIC.",
                mime_type.unwrap_or("unknown")
            ));
        }

        // 2. File size check
        let size_valid = file_size <= CF_MAX_BYTES;
        if !size_valid {
            errors.push(format!(
                "File too large ({:.1} MB). Maximum is 10 MB.",
                file_size as f32 / 1_048_576.0
            ));
        }

        // SVG / HEIC: skip raster decode
        let is_raster =
            mime_type.is_none_or(|m| !matches!(m, "image/svg+xml" | "image/heic" | "image/heif"));

        if !is_raster {
            return ImageValidationResult {
                format_valid,
                size_valid,
                dimensions_valid: true, // cannot check without raster decode
                width: None,
                height: None,
                file_size_bytes: file_size,
                errors,
                classification: None,
            };
        }

        // 3. Decode raster image
        let img = match ImageReader::new(Cursor::new(image_bytes))
            .with_guessed_format()
            .ok()
            .and_then(|r| r.decode().ok())
        {
            Some(i) => i,
            None => {
                errors.push(
                    "Cannot decode image. File may be corrupt or in an unsupported variant."
                        .to_string(),
                );
                return ImageValidationResult {
                    format_valid,
                    size_valid,
                    dimensions_valid: false,
                    width: None,
                    height: None,
                    file_size_bytes: file_size,
                    errors,
                    classification: None,
                };
            }
        };

        let (w, h) = img.dimensions();

        // 4. Dimension checks
        let mut dims_valid = true;
        if w > CF_MAX_DIMENSION || h > CF_MAX_DIMENSION {
            dims_valid = false;
            errors.push(format!(
                "Image too large ({w}×{h} px). Maximum is {CF_MAX_DIMENSION} px per side."
            ));
        }
        if (w as u64) * (h as u64) > CF_MAX_AREA {
            dims_valid = false;
            errors.push(format!(
                "Image area too large ({:.0} MP). Maximum is 100 MP.",
                (w as f64) * (h as f64) / 1_000_000.0
            ));
        }

        // 5. Classify only if image is valid
        let classification = if format_valid && size_valid && dims_valid {
            Some(Self::classify_image(&img))
        } else {
            None
        };

        ImageValidationResult {
            format_valid,
            size_valid,
            dimensions_valid: dims_valid,
            width: Some(w),
            height: Some(h),
            file_size_bytes: file_size,
            errors,
            classification,
        }
    }

    /// Classify a decoded image into doc type + side.
    fn classify_image(img: &DynamicImage) -> ClassificationResult {
        let (w, h) = img.dimensions();
        let aspect = w as f32 / h as f32;
        let gray = img.to_luma8();
        let rgb = img.to_rgb8();

        let doc_type = classify_doc_type(aspect);
        let has_mrz = detect_mrz_zone(&gray, w, h);
        let mrz_rows = count_mrz_rows(&gray, w, h);
        let has_photo = detect_photo_region(&rgb, w, h);
        // EU Regulation 2019/1157: every EU national ID card front face MUST show
        // the blue EU-flag rectangle (≈12×9 mm) with 12 yellow stars in the upper-
        // left corner. Detecting this blue+yellow cluster is a strong front-face cue.
        let has_eu_flag = detect_eu_flag_region(&rgb, w, h);

        let side = if doc_type == DetectedDocType::Passport {
            DetectedSide::Front // passports require only photo page
        } else {
            classify_id_side(has_mrz, mrz_rows, has_photo, has_eu_flag)
        };

        let confidence = compute_confidence(
            aspect,
            has_mrz,
            mrz_rows,
            has_photo,
            has_eu_flag,
            &doc_type,
            &side,
        );

        let mut warnings = Vec::new();
        if confidence < 0.5 {
            warnings.push(
                "Low confidence classification — please ensure the document is fully visible and well-lit.".to_string(),
            );
        }
        if doc_type == DetectedDocType::Unknown {
            warnings.push(
                "Could not determine document type from image. Verify the correct document type is selected.".to_string(),
            );
        }

        ClassificationResult {
            doc_type,
            side,
            confidence,
            aspect_ratio: aspect,
            has_mrz_zone: has_mrz,
            mrz_rows_detected: mrz_rows,
            has_photo_region: has_photo,
            has_eu_flag,
            country_hint: None, // requires OCR post-processing
            warnings,
        }
    }
}

// ── Classification helpers ────────────────────────────────────────────────────

/// EU ID-1 cards: 85.6 × 53.98 mm → ratio ≈ 1.586 (landscape).
/// Passport (TD3) photo page: usually scanned portrait (ratio < 1.0–1.3)
/// or landscape book-scan (ratio > 1.5 but full spread).
fn classify_doc_type(aspect: f32) -> DetectedDocType {
    if (1.45..=1.72).contains(&aspect) {
        DetectedDocType::EuIdCard // tight band around the ID-1 ratio 1.586
    } else if aspect < 1.0 || (1.1..=1.45).contains(&aspect) {
        DetectedDocType::Passport
    } else {
        DetectedDocType::Unknown
    }
}

/// Detect an MRZ zone using a horizontal-projection profile approach,
/// analogous to the OpenCV "blackhat morphology + row-sum thresholding"
/// method described in PyImageSearch (2015) and Zhu et al. (2014).
///
/// Steps (pure-Rust equivalent of the OpenCV pipeline):
///   1. Threshold the bottom 30% of the grayscale image (OTSU-like).
///   2. Build a horizontal projection: sum of dark pixels per row.
///   3. Identify rows whose dark-pixel count exceeds 15% of the row width
///      (OCR-B characters produce consistent horizontal ink bands).
///   4. If ≥ 20% of those rows qualify → MRZ zone present.
fn detect_mrz_zone(gray: &GrayImage, w: u32, h: u32) -> bool {
    let y_start = (h as f32 * 0.70) as u32;
    let x_lo = w / 12;
    let x_hi = w * 11 / 12;

    if x_lo >= x_hi || y_start >= h {
        return false;
    }

    let span = (x_hi - x_lo) as usize;
    // Compute adaptive threshold from bottom region histogram
    let threshold = adaptive_threshold(gray, x_lo, x_hi, y_start, h);

    let mut qualifying_rows = 0u32;
    let bottom_h = h - y_start;

    for y in y_start..h {
        let dark: u32 = (x_lo..x_hi)
            .filter(|&x| gray.get_pixel(x, y).0[0] < threshold)
            .count() as u32;

        // OCR-B characters fill ~20–65% of a MRZ row's horizontal extent
        let ratio = dark as f32 / span as f32;
        if (0.15..=0.70).contains(&ratio) {
            qualifying_rows += 1;
        }
    }

    qualifying_rows as f32 / bottom_h as f32 > 0.18
}

/// Compute a simple adaptive threshold from the pixel distribution in a region.
/// Returns the value that separates the darkest 30% from the rest.
fn adaptive_threshold(gray: &GrayImage, x_lo: u32, x_hi: u32, y_lo: u32, y_hi: u32) -> u8 {
    let mut hist = [0u32; 256];
    let mut total = 0u32;

    for y in y_lo..y_hi {
        for x in x_lo..x_hi {
            hist[gray.get_pixel(x, y).0[0] as usize] += 1;
            total += 1;
        }
    }

    if total == 0 {
        return 128;
    }

    let target = (total as f32 * 0.30) as u32; // darkest 30%
    let mut cum = 0u32;
    for (i, &cnt) in hist.iter().enumerate() {
        cum += cnt;
        if cum >= target {
            return i as u8;
        }
    }
    128
}

/// Count distinct MRZ text bands using a horizontal-projection approach.
///
/// A "band" is a run of consecutive qualifying rows interrupted by
/// at least one whitespace row (ink < 5% of row width).
/// TD1 ID cards have 3 bands; TD3 passports have 2 bands.
fn count_mrz_rows(gray: &GrayImage, w: u32, h: u32) -> u8 {
    let y_start = (h as f32 * 0.58) as u32;
    let x_lo = w / 12;
    let x_hi = w * 11 / 12;

    if x_lo >= x_hi || y_start >= h {
        return 0;
    }

    let span = (x_hi - x_lo) as usize;
    let threshold = adaptive_threshold(gray, x_lo, x_hi, y_start, h);

    let mut in_band = false;
    let mut bands = 0u8;

    for y in y_start..h {
        let dark: u32 = (x_lo..x_hi)
            .filter(|&x| gray.get_pixel(x, y).0[0] < threshold)
            .count() as u32;

        let ratio = dark as f32 / span as f32;
        let is_text = (0.12..=0.72).contains(&ratio);

        if is_text && !in_band {
            bands += 1;
            in_band = true;
        } else if !is_text && dark as f32 / (span as f32) < 0.04 {
            // Clear whitespace row ends the current band
            in_band = false;
        }
    }

    bands.min(3)
}

/// Detect the EU flag blue rectangle in the upper-left corner of the image.
///
/// Per EU Regulation 2019/1157, all EU national ID cards issued from 2021
/// must display the blue EU-flag rectangle (12 yellow stars on blue) in
/// the top-left of the front face.  Detecting a cluster of EU-blue pixels
/// (RGB ≈ 0, 51, 153 / #003399) in the upper-left 20% × 35% region is a
/// high-confidence signal that this is the **front** of an EU ID card.
fn detect_eu_flag_region(rgb: &RgbImage, w: u32, h: u32) -> bool {
    let x_hi = (w as f32 * 0.22) as u32;
    let y_hi = (h as f32 * 0.40) as u32;

    if x_hi == 0 || y_hi == 0 {
        return false;
    }

    let mut blue_pixels = 0u32;
    let mut total = 0u32;

    for y in 0..y_hi {
        for x in 0..x_hi {
            let p = rgb.get_pixel(x, y).0;
            let r = p[0] as i32;
            let g = p[1] as i32;
            let b = p[2] as i32;

            // EU flag blue: #003399 (0, 51, 153) — allow ±40 per channel for
            // scan artifacts, glare, JPEG compression and different card generations.
            if r < 80 && (10..=120).contains(&g) && b > 90 && b > r + 60 && b > g + 30 {
                blue_pixels += 1;
            }
            total += 1;
        }
    }

    if total == 0 {
        return false;
    }

    // EU flag area is roughly 14mm × 9mm on an 85.6×54mm card → ~16% of UL quadrant
    let ratio = blue_pixels as f32 / total as f32;
    ratio > 0.10
}

/// Detect a face/photo region in the left ~35% of the image using a
/// skin-tone heuristic that works across all skin tones (Peer et al. 2003).
fn detect_photo_region(rgb: &RgbImage, w: u32, h: u32) -> bool {
    let x_hi = (w as f32 * 0.40) as u32;
    let y_lo = (h as f32 * 0.10) as u32;
    let y_hi = (h as f32 * 0.90) as u32;

    if x_hi == 0 || y_lo >= y_hi {
        return false;
    }

    let mut skin = 0u64;
    let mut total = 0u64;

    for y in y_lo..y_hi {
        for x in 0..x_hi {
            let p = rgb.get_pixel(x, y).0;
            let r = p[0] as i32;
            let g = p[1] as i32;
            let b = p[2] as i32;

            // Peer et al. skin-tone rules (works for varied lighting/ethnicities)
            let max_c = r.max(g).max(b);
            let min_c = r.min(g).min(b);
            if r > 95
                && g > 40
                && b > 20
                && (max_c - min_c) > 15
                && r > g
                && r > b
                && (r - g).abs() > 15
            {
                skin += 1;
            }
            total += 1;
        }
    }

    if total == 0 {
        return false;
    }

    let ratio = skin as f32 / total as f32;
    // Front of ID: typical skin ratio 8–45% (face occupies part of the photo zone).
    ratio > 0.06
}

/// Classify front vs back of an EU ID card from MRZ + photo + EU-flag cues.
///
/// Decision tree based on research findings (PyImageSearch 2015, ICAO 9303):
///   Front: large photo (left side) + EU blue-flag rectangle (UL corner) + no MRZ
///   Back:  MRZ zone (3 rows TD1) at bottom + no large photo + no EU flag
fn classify_id_side(
    has_mrz: bool,
    mrz_rows: u8,
    has_photo: bool,
    has_eu_flag: bool,
) -> DetectedSide {
    match (has_photo, has_eu_flag, has_mrz, mrz_rows) {
        // Definitive front: photo + EU flag, no MRZ
        (true, true, false, _) => DetectedSide::Front,
        // Likely front: photo present, at most 1 MRZ row (could be partial overlap)
        (true, _, false, _) => DetectedSide::Front,
        (true, _, true, 0..=1) => DetectedSide::Front,
        // Definitive back: 3 MRZ rows (TD1), no large photo, no EU flag
        (false, false, true, 3) => DetectedSide::Back,
        // Likely back: 2+ MRZ rows, no dominant photo
        (false, _, true, 2..=3) => DetectedSide::Back,
        (_, false, true, 3) => DetectedSide::Back,
        _ => DetectedSide::Unknown,
    }
}

/// Compute overall confidence score from feature agreement with doc type + side.
fn compute_confidence(
    aspect: f32,
    has_mrz: bool,
    mrz_rows: u8,
    has_photo: bool,
    has_eu_flag: bool,
    doc_type: &DetectedDocType,
    side: &DetectedSide,
) -> f32 {
    let mut score: f32 = 0.35;

    // Aspect ratio deviation from the ID-1 standard (85.6/53.98 = 1.5858...)
    match doc_type {
        DetectedDocType::EuIdCard => {
            let dev = (aspect - 1.5858_f32).abs();
            score += (0.25 - dev.min(0.25)).max(0.0);
        }
        DetectedDocType::Passport => score += 0.10,
        DetectedDocType::Unknown => score -= 0.15,
    }

    // EU-flag detection is a very strong discriminator for front face
    if has_eu_flag && *side == DetectedSide::Front {
        score += 0.20;
    }

    // MRZ / photo agreement with the classified side
    match side {
        DetectedSide::Front if has_photo && !has_mrz => score += 0.20,
        DetectedSide::Front if has_photo => score += 0.10,
        DetectedSide::Back if has_mrz && mrz_rows >= 3 => score += 0.25, // TD1 = 3 rows
        DetectedSide::Back if has_mrz && mrz_rows == 2 => score += 0.15,
        DetectedSide::Back if has_mrz => score += 0.08,
        DetectedSide::Unknown => score -= 0.15,
        _ => {}
    }

    score.clamp(0.0, 1.0)
}

// ── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_allowed_format_valid() {
        for mime in &[
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "image/svg+xml",
            "image/heic",
            "image/heif",
        ] {
            assert!(is_allowed_format(mime), "should allow {mime}");
        }
    }

    #[test]
    fn test_is_allowed_format_invalid() {
        for mime in &["application/pdf", "image/tiff", "video/mp4", ""] {
            assert!(!is_allowed_format(mime), "should reject {mime}");
        }
    }

    #[test]
    fn test_classify_doc_type_id_card() {
        // ID-1 ratio 1.586
        assert_eq!(classify_doc_type(1.586), DetectedDocType::EuIdCard);
        assert_eq!(classify_doc_type(1.55), DetectedDocType::EuIdCard);
        assert_eq!(classify_doc_type(1.70), DetectedDocType::EuIdCard);
    }

    #[test]
    fn test_classify_doc_type_passport() {
        // Portrait scan
        assert_eq!(classify_doc_type(0.75), DetectedDocType::Passport);
        // Landscape passport page (TD3 ratio ≈ 1.42)
        assert_eq!(classify_doc_type(1.30), DetectedDocType::Passport);
    }

    #[test]
    fn test_classify_doc_type_unknown() {
        // Ambiguous: 1.73–1.99 not ID-1 and not portrait
        assert_eq!(classify_doc_type(1.90), DetectedDocType::Unknown);
    }

    #[test]
    fn test_classify_id_side_front() {
        // photo + EU flag, no MRZ → definitive front
        assert_eq!(classify_id_side(false, 0, true, true), DetectedSide::Front);
        // photo only, no MRZ → front
        assert_eq!(classify_id_side(false, 0, true, false), DetectedSide::Front);
        // photo + 1 MRZ row (borderline) → still front
        assert_eq!(classify_id_side(true, 1, true, false), DetectedSide::Front);
    }

    #[test]
    fn test_classify_id_side_back() {
        // TD1: 3 MRZ rows, no photo, no flag → definitive back
        assert_eq!(classify_id_side(true, 3, false, false), DetectedSide::Back);
        // 2 MRZ rows, no photo → likely back
        assert_eq!(classify_id_side(true, 2, false, false), DetectedSide::Back);
    }

    #[test]
    fn test_validate_and_classify_size_exceeded() {
        let big = vec![0u8; CF_MAX_BYTES + 1];
        let result = EuIdClassifier::validate_and_classify(&big, Some("image/jpeg"));
        assert!(!result.size_valid);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_validate_and_classify_bad_format() {
        let result = EuIdClassifier::validate_and_classify(b"fake", Some("application/pdf"));
        assert!(!result.format_valid);
        assert!(result
            .errors
            .iter()
            .any(|e| e.contains("Unsupported format")));
    }
}
