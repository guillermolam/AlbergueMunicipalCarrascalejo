//! Image preprocessing pipeline for document OCR.
//!
//! Pipeline (in order):
//!   1. Decode raw bytes (JPEG / PNG / WebP / TIFF / BMP)
//!   2. Upscale to at least 1 500 px on the long edge (Tesseract likes 150–300 DPI)
//!   3. Convert to 8-bit greyscale
//!   4. Gaussian denoise (radius 1, σ ≈ 1.0) to smooth JPEG artefacts
//!   5. Deskew — detect dominant text angle via variance-of-projections, rotate
//!   6. Global Otsu binarisation for uniform-background regions
//!   7. Adaptive binarisation fallback (local Otsu in 32-px tiles) for non-uniform lighting
//!   8. Return the better of (6) and (7) based on foreground pixel count heuristic

use anyhow::{bail, Result};
use image::{
    imageops::{self, FilterType},
    DynamicImage, GrayImage, ImageBuffer, Luma,
};
use imageproc::{
    contrast::{otsu_level, threshold, ThresholdType},
    filter::gaussian_blur_f32,
    geometric_transformations::{rotate_about_center, Interpolation},
};

// ── Constants ─────────────────────────────────────────────────────────────────

/// Minimum long-edge length (px) before we upscale.
const MIN_LONG_EDGE: u32 = 1_500;

/// Blur sigma for denoising before binarisation.
const DENOISE_SIGMA: f32 = 1.0;

/// Tile size for adaptive (local) binarisation.
const ADAPTIVE_TILE: u32 = 32;

/// Maximum skew correction angle (degrees). Beyond this we assume the image
/// is intentionally rotated (portrait landscape swap) and skip deskew.
const MAX_SKEW_DEG: f32 = 15.0;

// ── Public API ────────────────────────────────────────────────────────────────

/// Full preprocessing pipeline.  Returns a `GrayImage` ready for Tesseract.
pub fn preprocess(image_bytes: &[u8]) -> Result<GrayImage> {
    let img = decode(image_bytes)?;
    let img = upscale(img);
    let gray = img.to_luma8();
    let gray = denoise(gray);
    let gray = deskew(gray);
    let binary = binarise(&gray);
    Ok(binary)
}

/// Lightweight variant: skip deskew (useful for back-of-card MRZ strips where
/// the image is already cropped and axis-aligned).
pub fn preprocess_fast(image_bytes: &[u8]) -> Result<GrayImage> {
    let img = decode(image_bytes)?;
    let img = upscale(img);
    let gray = img.to_luma8();
    let gray = denoise(gray);
    let binary = binarise(&gray);
    Ok(binary)
}

/// Crop the bottom `fraction` of the image and preprocess it — used to isolate
/// the MRZ zone on passports / European ID cards (typically last 15-25%).
pub fn preprocess_mrz_zone(image_bytes: &[u8], bottom_fraction: f32) -> Result<GrayImage> {
    let img = decode(image_bytes)?;
    let img = upscale(img);
    let (w, h) = (img.width(), img.height());
    let crop_y = ((1.0 - bottom_fraction.clamp(0.1, 0.5)) * h as f32) as u32;
    let cropped = img.crop_imm(0, crop_y, w, h - crop_y);
    let gray = cropped.to_luma8();
    let gray = denoise(gray);
    // MRZ is already printed at uniform contrast — global Otsu is fine
    let level = otsu_level(&gray);
    Ok(threshold(&gray, level, ThresholdType::Binary))
}

// ── Step implementations ──────────────────────────────────────────────────────

fn decode(bytes: &[u8]) -> Result<DynamicImage> {
    if bytes.is_empty() {
        bail!("Empty image buffer");
    }
    image::load_from_memory(bytes).map_err(|e| anyhow::anyhow!("Image decode failed: {e}"))
}

fn upscale(img: DynamicImage) -> DynamicImage {
    let (w, h) = (img.width(), img.height());
    let long_edge = w.max(h);
    if long_edge < MIN_LONG_EDGE {
        let scale = MIN_LONG_EDGE as f32 / long_edge as f32;
        let nw = (w as f32 * scale).round() as u32;
        let nh = (h as f32 * scale).round() as u32;
        img.resize_exact(nw, nh, FilterType::Lanczos3)
    } else {
        img
    }
}

fn denoise(gray: GrayImage) -> GrayImage {
    gaussian_blur_f32(&gray, DENOISE_SIGMA)
}

/// Variance-of-horizontal-projections deskew.
///
/// For each candidate angle θ ∈ [−MAX_SKEW, +MAX_SKEW] (0.5° step) we rotate
/// the image and compute the variance of row-pixel-sums.  A well-aligned
/// text image has high inter-row variance (dark rows = text, bright rows =
/// gaps).  We pick the angle that maximises this variance.
fn deskew(gray: GrayImage) -> GrayImage {
    let (w, h) = gray.dimensions();
    // Skip very small images — not enough signal.
    if w < 100 || h < 50 {
        return gray;
    }

    let best_angle = find_skew_angle(&gray);

    if best_angle.abs() < 0.3 {
        return gray; // negligible skew
    }

    rotate_about_center(
        &gray,
        best_angle.to_radians(),
        Interpolation::Bilinear,
        Luma([255u8]),
    )
}

fn find_skew_angle(gray: &GrayImage) -> f32 {
    let (w, h) = gray.dimensions();
    // Work on a downscaled copy (max 600 px wide) for speed.
    let scale = (600.0_f32 / w as f32).min(1.0);
    let sw = (w as f32 * scale) as u32;
    let sh = (h as f32 * scale) as u32;
    let small: GrayImage = imageops::resize(gray, sw, sh, FilterType::Triangle);

    let mut best_angle = 0.0_f32;
    let mut best_var = -1.0_f32;

    let steps = (MAX_SKEW_DEG / 0.5) as i32 * 2 + 1;
    for i in 0..=steps {
        let angle_deg = -MAX_SKEW_DEG + i as f32 * 0.5;
        let rotated = rotate_about_center(
            &small,
            angle_deg.to_radians(),
            Interpolation::Nearest,
            Luma([255u8]),
        );
        let v = row_sum_variance(&rotated);
        if v > best_var {
            best_var = v;
            best_angle = angle_deg;
        }
    }
    best_angle
}

/// Compute variance of per-row average pixel values.
fn row_sum_variance(img: &GrayImage) -> f32 {
    let (w, h) = img.dimensions();
    if h == 0 || w == 0 {
        return 0.0;
    }
    let sums: Vec<f32> = (0..h)
        .map(|y| {
            let row_sum: u64 = (0..w).map(|x| img.get_pixel(x, y).0[0] as u64).sum();
            row_sum as f32 / w as f32
        })
        .collect();
    let mean = sums.iter().sum::<f32>() / h as f32;
    sums.iter().map(|v| (v - mean).powi(2)).sum::<f32>() / h as f32
}

/// Returns the better of global-Otsu and adaptive binarisation.
fn binarise(gray: &GrayImage) -> GrayImage {
    let global = {
        let level = otsu_level(gray);
        threshold(gray, level, ThresholdType::Binary)
    };
    let adaptive = adaptive_threshold(gray);

    // Choose whichever produces a "healthier" foreground ratio.
    // Ideal text images have 5–35% dark pixels after binarisation.
    let global_ratio = dark_pixel_ratio(&global);
    let adaptive_ratio = dark_pixel_ratio(&adaptive);

    let target_lo = 0.05_f32;
    let target_hi = 0.35_f32;

    let global_ok = (target_lo..=target_hi).contains(&global_ratio);
    let adaptive_ok = (target_lo..=target_hi).contains(&adaptive_ratio);

    match (global_ok, adaptive_ok) {
        (true, false) => global,
        (false, true) => adaptive,
        // Both in range: prefer global (cleaner for uniform-lit cards)
        (true, true) => global,
        // Both out of range: prefer whichever is closer to midpoint
        (false, false) => {
            let mid = (target_lo + target_hi) / 2.0;
            if (global_ratio - mid).abs() <= (adaptive_ratio - mid).abs() {
                global
            } else {
                adaptive
            }
        }
    }
}

/// Local (adaptive) Otsu binarisation in non-overlapping tiles.
fn adaptive_threshold(gray: &GrayImage) -> GrayImage {
    let (w, h) = gray.dimensions();
    let mut out: GrayImage = ImageBuffer::new(w, h);

    let tile_w = ADAPTIVE_TILE.min(w);
    let tile_h = ADAPTIVE_TILE.min(h);

    let cols = w.div_ceil(tile_w);
    let rows = h.div_ceil(tile_h);

    for row in 0..rows {
        for col in 0..cols {
            let x0 = col * tile_w;
            let y0 = row * tile_h;
            let x1 = (x0 + tile_w).min(w);
            let y1 = (y0 + tile_h).min(h);
            let tw = x1 - x0;
            let th = y1 - y0;
            if tw == 0 || th == 0 {
                continue;
            }
            // Extract tile pixels
            let mut tile_pixels: Vec<u8> = Vec::with_capacity((tw * th) as usize);
            for ty in y0..y1 {
                for tx in x0..x1 {
                    tile_pixels.push(gray.get_pixel(tx, ty).0[0]);
                }
            }
            // Local Otsu on tile
            let tile_img: GrayImage =
                ImageBuffer::from_vec(tw, th, tile_pixels).unwrap_or_default();
            let level = otsu_level(&tile_img);
            // Write binarised pixels back
            for ty in y0..y1 {
                for tx in x0..x1 {
                    let px = gray.get_pixel(tx, ty).0[0];
                    let bx = if px > level { 255u8 } else { 0u8 };
                    out.put_pixel(tx, ty, Luma([bx]));
                }
            }
        }
    }
    out
}

fn dark_pixel_ratio(img: &GrayImage) -> f32 {
    let total = img.width() * img.height();
    if total == 0 {
        return 0.0;
    }
    let dark: u32 = img.pixels().filter(|p| p.0[0] < 128).count() as u32;
    dark as f32 / total as f32
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use image::ImageBuffer;

    fn make_white_image(w: u32, h: u32) -> Vec<u8> {
        let img: GrayImage = ImageBuffer::from_fn(w, h, |_, _| Luma([255u8]));
        let mut buf = std::io::Cursor::new(Vec::new());
        img.write_to(&mut buf, image::ImageFormat::Png).unwrap();
        buf.into_inner()
    }

    fn make_text_like_image(w: u32, h: u32) -> Vec<u8> {
        // Alternating dark and light rows (simulates text lines)
        let img: GrayImage = ImageBuffer::from_fn(w, h, |_, y| {
            if y % 10 < 3 {
                Luma([30u8]) // dark text rows
            } else {
                Luma([240u8]) // light background
            }
        });
        let mut buf = std::io::Cursor::new(Vec::new());
        img.write_to(&mut buf, image::ImageFormat::Png).unwrap();
        buf.into_inner()
    }

    #[test]
    fn test_preprocess_white_image() {
        let bytes = make_white_image(300, 200);
        let result = preprocess(&bytes);
        assert!(result.is_ok(), "preprocess should succeed on white image");
        let img = result.unwrap();
        // White image → all pixels should be 255 after binarisation
        let dark = img.pixels().filter(|p| p.0[0] < 128).count();
        // Very few dark pixels expected (< 5%)
        let ratio = dark as f32 / (img.width() * img.height()) as f32;
        assert!(
            ratio < 0.1,
            "white image should have very few dark pixels, got {ratio:.3}"
        );
    }

    #[test]
    fn test_preprocess_text_like() {
        let bytes = make_text_like_image(800, 400);
        let result = preprocess(&bytes);
        assert!(result.is_ok());
        let img = result.unwrap();
        // Should have some dark pixels (text)
        let dark = img.pixels().filter(|p| p.0[0] < 128).count();
        assert!(dark > 0, "text-like image should produce dark pixels");
    }

    #[test]
    fn test_preprocess_fast() {
        let bytes = make_text_like_image(600, 300);
        assert!(preprocess_fast(&bytes).is_ok());
    }

    #[test]
    fn test_preprocess_mrz_zone() {
        let bytes = make_text_like_image(1000, 600);
        let result = preprocess_mrz_zone(&bytes, 0.20);
        assert!(result.is_ok());
        let mrz = result.unwrap();
        // MRZ crop should be ~20% of original height after upscale
        assert!(mrz.height() > 0);
    }

    #[test]
    fn test_upscale_small_image() {
        // 400×250 image should be upscaled
        let bytes = make_white_image(400, 250);
        let img = decode(&bytes).unwrap();
        let upscaled = upscale(img);
        assert!(
            upscaled.width().max(upscaled.height()) >= MIN_LONG_EDGE,
            "small image should be upscaled to at least {MIN_LONG_EDGE}px"
        );
    }

    #[test]
    fn test_upscale_large_image_unchanged() {
        // 2000×1500 image should NOT be upscaled
        let img: GrayImage = ImageBuffer::from_fn(2000, 1500, |_, _| Luma([200u8]));
        let dyn_img = DynamicImage::ImageLuma8(img);
        let (orig_w, orig_h) = (dyn_img.width(), dyn_img.height());
        let result = upscale(dyn_img);
        assert_eq!(result.width(), orig_w);
        assert_eq!(result.height(), orig_h);
    }

    #[test]
    fn test_dark_pixel_ratio_all_white() {
        let img: GrayImage = ImageBuffer::from_fn(100, 100, |_, _| Luma([255u8]));
        assert!(dark_pixel_ratio(&img) < 0.01);
    }

    #[test]
    fn test_dark_pixel_ratio_all_black() {
        let img: GrayImage = ImageBuffer::from_fn(100, 100, |_, _| Luma([0u8]));
        assert!(dark_pixel_ratio(&img) > 0.99);
    }

    #[test]
    fn test_empty_bytes_fails() {
        let result = preprocess(&[]);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_bytes_fails() {
        let result = preprocess(b"not an image");
        assert!(result.is_err());
    }
}
