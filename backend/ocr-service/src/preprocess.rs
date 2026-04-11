//! Image preprocessing — grayscale + Otsu's binarisation.
//!
//! Following the tutorial pattern:
//!   open → to_luma8 → compute Otsu threshold → threshold_mut (binarise)
//!
//! Binarisation dramatically improves Tesseract accuracy on scanned ID
//! documents by removing background noise and normalising contrast.

use anyhow::Result;
use image::GrayImage;
use imageproc::contrast::{otsu_level, threshold, ThresholdType};

/// Decode raw image bytes, convert to grayscale, and apply Otsu binarisation.
/// Returns a `GrayImage` ready to be saved and fed into Tesseract.
pub fn preprocess(image_bytes: &[u8]) -> Result<GrayImage> {
    // Decode from raw bytes (JPEG / PNG / WebP / etc.)
    let img = image::load_from_memory(image_bytes)?;

    // Step 1: convert to 8-bit greyscale
    let mut gray = img.to_luma8();

    // Step 2: compute Otsu threshold — finds the optimal split between
    // foreground (text) and background pixels automatically
    let level = otsu_level(&gray);

    // Step 3: binarise — pixels above threshold → white, below → black
    let binary = threshold(&gray, level, ThresholdType::Binary);
    gray = binary;

    Ok(gray)
}
