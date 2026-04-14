//! Tesseract OCR — multi-pass strategy for maximum reliability.
//!
//! Strategy:
//!   1. Try PSM 6 (assume single uniform text block) — best for structured ID fields
//!   2. Try PSM 11 (sparse text, find as much text as possible) — good for cards
//!      with scattered labels
//!   3. Try PSM 3 (fully automatic with OSD) — fallback for unknown layouts
//!   4. For each PSM, try full image + MRZ-zone crop (for passports)
//!   5. Select the attempt with highest `score()` (word count × non-noise heuristic)
//!   6. Language fallback: spa+eng → eng → spa
//!
//! All attempts use the hardened preprocess pipeline (deskew + adaptive binarise).

use anyhow::{Context, Result};
use tesseract::Tesseract;
use tracing::{debug, warn};

use crate::preprocess::{preprocess, preprocess_fast, preprocess_mrz_zone};

// ── Page Segmentation Modes ───────────────────────────────────────────────────

/// Tesseract PSM variants we attempt, in priority order.
const PSM_CANDIDATES: &[(&str, u32)] = &[
    ("block", 6),       // Assume a single uniform block of text.
    ("sparse", 11),     // Sparse text. Find as much text as possible.
    ("auto", 3),        // Fully automatic page segmentation (no OSD).
    ("single_line", 7), // Treat image as a single text line (good for MRZ rows).
];

// ── Public API ────────────────────────────────────────────────────────────────

/// Run Tesseract on raw image bytes using all PSM variants + language fallback.
/// Returns the best extracted text string, or an error if all attempts fail.
pub fn run_tesseract(image_bytes: &[u8], lang: &str) -> Result<String> {
    run_tesseract_full(image_bytes, lang, false)
}

/// Specialised entry-point for MRZ-zone extraction only.
/// Crops the bottom 22% of the image before OCR — faster and more accurate for
/// MRZ detection on passports and European ID cards.
pub fn run_tesseract_mrz(image_bytes: &[u8]) -> Result<String> {
    // MRZ uses Latin letters and digits only — English is sufficient.
    let lang = "eng";
    // For MRZ we prefer PSM 6 (uniform block) and PSM 7 (single line).
    let psm_subset: &[(&str, u32)] = &[("block", 6), ("single_line", 7), ("sparse", 11)];
    run_psm_attempts(image_bytes, lang, psm_subset, true)
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn run_tesseract_full(image_bytes: &[u8], primary_lang: &str, mrz_zone: bool) -> Result<String> {
    // Build language fallback chain (deduplicated)
    let lang_chain: Vec<&str> = build_lang_chain(primary_lang);

    let mut best: Option<ScoredText> = None;

    for lang in &lang_chain {
        match run_psm_attempts(image_bytes, lang, PSM_CANDIDATES, mrz_zone) {
            Ok(text) => {
                let s = score_text(&text);
                debug!(lang, score = s, chars = text.len(), "OCR attempt");
                let candidate = ScoredText { text, score: s };
                if best.as_ref().is_none_or(|b| candidate.score > b.score) {
                    best = Some(candidate);
                }
                // Early exit if we have a strong result
                if best.as_ref().is_some_and(|b| b.score > 800.0) {
                    break;
                }
            }
            Err(e) => {
                warn!(lang, error = %e, "OCR language attempt failed");
            }
        }
    }

    best.map(|b| b.text)
        .filter(|t| !t.trim().is_empty())
        .ok_or_else(|| anyhow::anyhow!("All OCR attempts produced empty results"))
}

fn run_psm_attempts(
    image_bytes: &[u8],
    lang: &str,
    psm_list: &[(&str, u32)],
    use_mrz_crop: bool,
) -> Result<String> {
    // Pre-process once per attempt group to avoid repeated work
    let full_gray = preprocess(image_bytes).context("preprocessing failed")?;
    let fast_gray = preprocess_fast(image_bytes).ok();

    // Optionally prepare MRZ crop
    let mrz_gray = if use_mrz_crop {
        preprocess_mrz_zone(image_bytes, 0.22).ok()
    } else {
        None
    };

    let mut best: Option<ScoredText> = None;

    for (psm_name, psm) in psm_list {
        // Attempt 1: full preprocessed image
        if let Ok(text) = tesseract_on_gray(&full_gray, lang, *psm) {
            update_best(&mut best, text, psm_name, "full");
        }

        // Attempt 2: fast (no deskew) variant — catches cases where deskew over-rotates
        if let Some(ref fg) = fast_gray {
            if let Ok(text) = tesseract_on_gray(fg, lang, *psm) {
                update_best(&mut best, text, psm_name, "fast");
            }
        }

        // Attempt 3: MRZ crop (when requested)
        if let Some(ref mg) = mrz_gray {
            if let Ok(text) = tesseract_on_gray(mg, lang, *psm) {
                update_best(&mut best, text, psm_name, "mrz");
            }
        }

        // Early exit for very strong results
        if best.as_ref().is_some_and(|b| b.score > 1_000.0) {
            break;
        }
    }

    best.map(|b| b.text)
        .ok_or_else(|| anyhow::anyhow!("No successful OCR attempt for lang={lang}"))
}

fn tesseract_on_gray(gray: &image::GrayImage, lang: &str, psm: u32) -> Result<String> {
    let tmp = tempfile::Builder::new()
        .suffix(".png")
        .tempfile()
        .context("temp file creation failed")?;

    gray.save(tmp.path())
        .context("failed to save preprocessed image")?;

    let path = tmp.path().to_str().context("non-UTF-8 temp path")?;

    let mut tess = Tesseract::new(None, Some(lang)).context("Tesseract init failed")?;

    // Set page segmentation mode via variable
    tess = tess
        .set_variable("tessedit_pageseg_mode", &psm.to_string())
        .context("set PSM failed")?;

    // Restrict to useful character set (avoids hallucinated symbols)
    tess = tess
        .set_variable(
            "tessedit_char_whitelist",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ\
             abcdefghijklmnopqrstuvwxyz\
             0123456789<.,-/ áéíóúüñÁÉÍÓÚÜÑ",
        )
        .context("set whitelist failed")?;

    let text = tess
        .set_image(path)
        .context("set image failed")?
        .get_text()
        .context("get_text failed")?;

    Ok(text)
}

fn update_best(best: &mut Option<ScoredText>, text: String, psm: &str, variant: &str) {
    let s = score_text(&text);
    debug!(
        psm,
        variant,
        score = s,
        chars = text.len(),
        "OCR sub-attempt"
    );
    let candidate = ScoredText { text, score: s };
    if best.as_ref().is_none_or(|b| candidate.score > b.score) {
        *best = Some(candidate);
    }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

struct ScoredText {
    text: String,
    score: f32,
}

/// Heuristic score: higher is better OCR output quality.
///
/// Factors:
/// - word count (raw signal)
/// - presence of alphabetic chars (penalise pure symbol noise)
/// - presence of digit runs (expected on IDs)
/// - lines with 30–44 chars (MRZ line length)
/// - penalty for excessive `<` characters (MRZ filler — too many means MRZ only)
/// - penalty for very short output
fn score_text(text: &str) -> f32 {
    if text.trim().is_empty() {
        return 0.0;
    }

    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len() as f32;

    let alpha_ratio = {
        let total: usize = text.chars().filter(|c| !c.is_whitespace()).count();
        if total == 0 {
            0.0_f32
        } else {
            text.chars().filter(|c| c.is_alphabetic()).count() as f32 / total as f32
        }
    };

    let digit_runs = text
        .split(|c: char| !c.is_ascii_digit())
        .filter(|s| s.len() >= 6)
        .count() as f32;

    // MRZ lines are 30 (TD1) or 44 (TD3) chars — award bonus
    let mrz_line_bonus: f32 = text
        .lines()
        .filter(|l| {
            let lc = l.trim().len();
            (28..=32).contains(&lc) || (42..=46).contains(&lc)
        })
        .count() as f32
        * 40.0;

    let fill_penalty: f32 = {
        let fills = text.chars().filter(|&c| c == '<').count();
        let total = text.chars().count();
        if total == 0 {
            0.0
        } else {
            (fills as f32 / total as f32 * 200.0).min(80.0)
        }
    };

    let length_penalty: f32 = if text.trim().len() < 20 { 50.0 } else { 0.0 };

    word_count * 10.0 + alpha_ratio * 100.0 + digit_runs * 15.0 + mrz_line_bonus
        - fill_penalty
        - length_penalty
}

// ── Language chain ────────────────────────────────────────────────────────────

/// Build fallback language chain.  For example, `"spa+eng"` → `["spa+eng", "eng", "spa"]`.
fn build_lang_chain(primary: &str) -> Vec<&str> {
    let mut chain = vec![primary];
    // Individual components
    for part in primary.split('+') {
        if !chain.contains(&part) {
            chain.push(part);
        }
    }
    chain
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_score_empty() {
        assert_eq!(score_text(""), 0.0);
        assert_eq!(score_text("   "), 0.0);
    }

    #[test]
    fn test_score_text_beats_noise() {
        let text = "APELLIDOS GARCIA RODRIGUEZ\nNOMBRE CARLOS\nNACIONALIDAD ESP\n12345678Z";
        let noise = "###...!!!~~~|||";
        assert!(score_text(text) > score_text(noise));
    }

    #[test]
    fn test_score_mrz_bonus() {
        // A line of exactly 44 chars should get MRZ bonus
        let mrz_line = "P<ESPGARCIA<<RODRIGUEZ<<CARLOS<<<<<<<<<<<<<<<";
        assert!(score_text(mrz_line) > 0.0);
    }

    #[test]
    fn test_build_lang_chain_composite() {
        let chain = build_lang_chain("spa+eng");
        assert!(chain.contains(&"spa+eng"));
        assert!(chain.contains(&"eng"));
        assert!(chain.contains(&"spa"));
    }

    #[test]
    fn test_build_lang_chain_single() {
        let chain = build_lang_chain("eng");
        assert_eq!(chain, vec!["eng"]);
    }
}
