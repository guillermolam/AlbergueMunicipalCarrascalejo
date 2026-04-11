//! Tesseract OCR — wraps the tutorial pattern into a reusable function.
//!
//! Pipeline (per the tutorial):
//!   raw bytes → preprocess (grayscale + Otsu) → save tmp PNG → Tesseract → text

use anyhow::{Context, Result};
use tesseract::Tesseract;

use crate::preprocess::preprocess;

/// Run Tesseract OCR on raw image bytes.
///
/// `lang` is a `+`-joined list of Tesseract language codes, e.g. `"spa+eng"`.
/// Returns the raw extracted text string.
pub fn run_tesseract(image_bytes: &[u8], lang: &str) -> Result<String> {
    // Step 1 & 2: grayscale + Otsu binarisation
    let gray = preprocess(image_bytes).context("image preprocessing failed")?;

    // Step 3: save preprocessed image to a temp file
    // Tesseract's Rust binding takes a file path, not raw bytes.
    let tmp = tempfile::Builder::new()
        .suffix(".png")
        .tempfile()
        .context("failed to create temp file")?;

    gray.save(tmp.path()).context("failed to save preprocessed image")?;

    let tmp_path = tmp
        .path()
        .to_str()
        .context("temp file path is not valid UTF-8")?;

    // Step 4: run Tesseract
    // `None` for data path → uses system-installed tessdata directory.
    let text = Tesseract::new(None, Some(lang))
        .context("failed to initialise Tesseract")?
        .set_image(tmp_path)
        .context("failed to set Tesseract input image")?
        .get_text()
        .context("Tesseract text extraction failed")?;

    Ok(text)
}
