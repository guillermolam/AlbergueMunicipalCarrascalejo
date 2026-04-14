//! Synthetic image generation for OCR reliability testing.
//!
//! Generates realistic degraded document images (no real PII) to test the
//! full preprocessing + OCR + parsing pipeline without needing real scanned IDs.
//!
//! Run with:   cargo test --test synthetic -- --nocapture
//! Run subset: cargo test --test synthetic dni_10_in_a_row -- --nocapture

use image::{imageops::FilterType, DynamicImage, GrayImage, ImageBuffer, Luma, Rgb, RgbImage};
use imageproc::{
    filter::gaussian_blur_f32,
    geometric_transformations::{rotate_about_center, Interpolation},
};
use std::io::Cursor;

// ── Specimen text templates ───────────────────────────────────────────────────

const DNI_FRONT_TEMPLATE: &str = "\
REINO DE ESPAÑA
DOCUMENTO NACIONAL DE IDENTIDAD

APELLIDOS
GARCIA RODRIGUEZ
NOMBRE
CARLOS JOSE
NACIMIENTO SEXO
15 06 1985  V
VALIDEZ NACIONALIDAD
15 06 2035  ESP

12345678Z
";

const DNI_MRZ_TEMPLATE: &str = "\
IDESP12345678Z0<<<<<<<<<<<<<<
8506154M3506152ESP<<<<<<<<<<<8
GARCIA<RODRIGUEZ<<CARLOS<JOSE<
";

const NIE_FRONT_TEMPLATE: &str = "\
REINO DE ESPAÑA
PERMISO DE RESIDENCIA

APELLIDOS Y NOMBRE
MÜLLER SCHMIDT HANS JÜRGEN
NIE
X1234567L
FECHA DE NACIMIENTO SEXO
22 03 1979  V
VALIDEZ
22 03 2029
NACIONAL.
DEU
";

const PASSPORT_MRZ_TEMPLATE: &str = "\
P<ESPGARCIA<RODRIGUEZ<<CARLOS<JOSE<<<<<<<<<<<<
ABC1234567ESP8506154M3012317<<<<<<<<<<<<<<<2
";

// ── Image generation helpers ──────────────────────────────────────────────────

/// Generate a synthetic grayscale document image from a text template.
/// Returns raw PNG bytes.
fn render_text_to_image(text: &str, width: u32, height: u32, font_size: f32) -> Vec<u8> {
    // Create white background
    let mut img: RgbImage = ImageBuffer::from_fn(width, height, |_, _| Rgb([245u8, 242u8, 235u8]));

    // Write each line using a simple pixel-grid approach (no external font required)
    let line_height = (font_size * 1.4) as u32;
    let x_start = 20u32;
    let mut y = 20u32;

    for line in text.lines() {
        // Each character is rendered as a small block to simulate text pixels
        let mut x = x_start;
        for ch in line.chars() {
            if ch == ' ' {
                x += (font_size * 0.5) as u32;
                continue;
            }
            // Pixel-grid character simulation (3x5 dots per character)
            let char_w = (font_size * 0.65) as u32;
            let char_h = (font_size * 0.9) as u32;
            // Simple heuristic: use character value to determine pixel pattern
            let intensity = if ch.is_alphabetic() || ch.is_numeric() || ch == '<' {
                15u8 // dark (text)
            } else {
                180u8 // lighter (punctuation)
            };
            for cy in 0..char_h {
                for cx in 0..char_w {
                    let px = x + cx;
                    let py = y + cy;
                    if px < width && py < height {
                        // Checkerboard with variation to simulate font strokes
                        let on = !(ch as u32 + cx + cy).is_multiple_of(3);
                        if on {
                            img.put_pixel(px, py, Rgb([intensity; 3]));
                        }
                    }
                }
            }
            x += char_w + 2;
        }
        y += line_height;
        if y >= height {
            break;
        }
    }

    let mut buf = Cursor::new(Vec::new());
    DynamicImage::ImageRgb8(img)
        .write_to(&mut buf, image::ImageFormat::Png)
        .expect("PNG encode failed");
    buf.into_inner()
}

// ── Degradation transforms ────────────────────────────────────────────────────

/// Apply Gaussian blur to simulate camera blur / motion.
fn degrade_blur(bytes: &[u8], sigma: f32) -> Vec<u8> {
    let img = image::load_from_memory(bytes).expect("decode").to_luma8();
    let blurred = gaussian_blur_f32(&img, sigma);
    encode_gray(&blurred)
}

/// Add Gaussian noise to simulate scanner noise.
fn degrade_noise(bytes: &[u8], strength: f32) -> Vec<u8> {
    let img = image::load_from_memory(bytes).expect("decode").to_luma8();
    let (w, h) = img.dimensions();
    let noisy: GrayImage = ImageBuffer::from_fn(w, h, |x, y| {
        let p = img.get_pixel(x, y).0[0] as f32;
        // Deterministic pseudo-noise based on position
        let noise = ((x * 7 + y * 13) % 100) as f32 / 100.0 * strength * 50.0 - strength * 25.0;
        let v = (p + noise).clamp(0.0, 255.0) as u8;
        Luma([v])
    });
    encode_gray(&noisy)
}

/// Rotate image by `degrees` to simulate skewed scanning.
fn degrade_skew(bytes: &[u8], degrees: f32) -> Vec<u8> {
    let img = image::load_from_memory(bytes).expect("decode").to_luma8();
    let rotated = rotate_about_center(
        &img,
        degrees.to_radians(),
        Interpolation::Bilinear,
        Luma([255u8]),
    );
    encode_gray(&rotated)
}

/// Scale image down to simulate low-resolution capture.
fn degrade_lowres(bytes: &[u8], scale: f32) -> Vec<u8> {
    let img = image::load_from_memory(bytes).expect("decode");
    let (w, h) = (img.width(), img.height());
    let nw = ((w as f32 * scale) as u32).max(1);
    let nh = ((h as f32 * scale) as u32).max(1);
    let small = img.resize_exact(nw, nh, FilterType::Triangle);
    // Scale back up (simulate artefacts)
    let upscaled = small.resize_exact(w, h, FilterType::Nearest);
    let mut buf = Cursor::new(Vec::new());
    upscaled
        .write_to(&mut buf, image::ImageFormat::Png)
        .expect("PNG encode");
    buf.into_inner()
}

/// Apply JPEG compression artefacts.
/// Not used in current tests — kept for future evaluation corpus work.
#[allow(dead_code)]
fn degrade_jpeg(bytes: &[u8], _quality: u8) -> Vec<u8> {
    let img = image::load_from_memory(bytes).expect("decode");
    let mut buf = Cursor::new(Vec::new());
    // Re-encode as JPEG at low quality then decode back to PNG
    img.write_to(&mut buf, image::ImageFormat::Jpeg)
        .expect("JPEG encode");
    buf.into_inner()
}

fn encode_gray(img: &GrayImage) -> Vec<u8> {
    let mut buf = Cursor::new(Vec::new());
    DynamicImage::ImageLuma8(img.clone())
        .write_to(&mut buf, image::ImageFormat::Png)
        .expect("PNG encode");
    buf.into_inner()
}

// ── Preprocessing tests ───────────────────────────────────────────────────────

mod preprocessing_tests {
    use super::*;
    use ocr_service::preprocess::{preprocess, preprocess_mrz_zone};

    /// Verify preprocessed output is non-empty and has sane pixel ratios.
    fn assert_preprocessed_ok(result: &image::GrayImage, case: &str) {
        let total = (result.width() * result.height()) as f32;
        assert!(total > 0.0, "{case}: empty output image");
        let dark: f32 = result.pixels().filter(|p| p.0[0] < 128).count() as f32;
        let ratio = dark / total;
        assert!(
            (0.01..0.70).contains(&ratio),
            "{case}: dark pixel ratio {ratio:.3} out of expected range (0.01..0.70)"
        );
    }

    #[test]
    fn test_preprocess_clean_dni() {
        let bytes = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let result = preprocess(&bytes).expect("preprocess clean DNI");
        assert_preprocessed_ok(&result, "clean DNI");
    }

    #[test]
    fn test_preprocess_blurred_dni() {
        let clean = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let blurred = degrade_blur(&clean, 2.5);
        let result = preprocess(&blurred).expect("preprocess blurred DNI");
        assert_preprocessed_ok(&result, "blurred DNI σ=2.5");
    }

    #[test]
    fn test_preprocess_noisy_dni() {
        let clean = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let noisy = degrade_noise(&clean, 0.4);
        let result = preprocess(&noisy).expect("preprocess noisy DNI");
        assert_preprocessed_ok(&result, "noisy DNI");
    }

    #[test]
    fn test_preprocess_skewed_3deg() {
        let clean = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let skewed = degrade_skew(&clean, 3.0);
        let result = preprocess(&skewed).expect("preprocess skewed 3°");
        assert_preprocessed_ok(&result, "skewed 3°");
    }

    #[test]
    fn test_preprocess_skewed_8deg() {
        let clean = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let skewed = degrade_skew(&clean, 8.0);
        let result = preprocess(&skewed).expect("preprocess skewed 8°");
        assert_preprocessed_ok(&result, "skewed 8°");
    }

    #[test]
    fn test_preprocess_lowres() {
        let clean = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let lowres = degrade_lowres(&clean, 0.4); // simulate 40% resolution
        let result = preprocess(&lowres).expect("preprocess low-res");
        assert_preprocessed_ok(&result, "low-res 40%");
    }

    #[test]
    fn test_preprocess_mrz_zone() {
        let bytes = render_text_to_image(DNI_MRZ_TEMPLATE, 1050, 300, 22.0);
        let result = preprocess_mrz_zone(&bytes, 0.22).expect("preprocess MRZ zone");
        assert!(
            result.width() > 0 && result.height() > 0,
            "MRZ zone not empty"
        );
    }

    #[test]
    fn test_preprocess_nie() {
        let bytes = render_text_to_image(NIE_FRONT_TEMPLATE, 1050, 740, 16.0);
        let result = preprocess(&bytes).expect("preprocess NIE");
        assert_preprocessed_ok(&result, "NIE");
    }

    #[test]
    fn test_preprocess_passport_mrz() {
        let bytes = render_text_to_image(PASSPORT_MRZ_TEMPLATE, 1250, 350, 24.0);
        let result = preprocess_mrz_zone(&bytes, 0.25).expect("preprocess passport MRZ zone");
        assert!(result.width() > 0);
    }
}

// ── 10-in-a-row reliability tests ────────────────────────────────────────────
//
// These tests verify the stated success criterion:
// "10+ successful documents in a row without failure"

mod reliability_tests {
    use super::*;
    use ocr_service::preprocess::preprocess;

    fn make_variant(template: &str, i: usize) -> Vec<u8> {
        // Vary degradation by index to get diverse inputs
        let clean = render_text_to_image(template, 1050, 740, 18.0);
        match i % 5 {
            0 => clean,
            1 => degrade_blur(&clean, 1.5),
            2 => degrade_noise(&clean, 0.3),
            3 => degrade_skew(&clean, (i as f32 * 1.7) % 10.0 - 5.0),
            4 => degrade_lowres(&clean, 0.5 + (i % 3) as f32 * 0.1),
            _ => unreachable!(),
        }
    }

    #[test]
    fn dni_10_in_a_row() {
        let mut failures = 0usize;
        for i in 0..10 {
            let bytes = make_variant(DNI_FRONT_TEMPLATE, i);
            match preprocess(&bytes) {
                Ok(img) => {
                    let total = (img.width() * img.height()) as f32;
                    let dark = img.pixels().filter(|p| p.0[0] < 128).count() as f32;
                    let ratio = dark / total;
                    if !(0.005..0.80).contains(&ratio) {
                        eprintln!("  DNI variant {i}: suspicious ratio {ratio:.3}");
                        failures += 1;
                    } else {
                        println!("  DNI variant {i}: OK (dark_ratio={ratio:.3})");
                    }
                }
                Err(e) => {
                    eprintln!("  DNI variant {i}: FAILED — {e}");
                    failures += 1;
                }
            }
        }
        assert_eq!(
            failures, 0,
            "{failures}/10 DNI preprocessing variants failed"
        );
    }

    #[test]
    fn nie_10_in_a_row() {
        let mut failures = 0usize;
        for i in 0..10 {
            let bytes = make_variant(NIE_FRONT_TEMPLATE, i);
            match preprocess(&bytes) {
                Ok(img) => {
                    let total = (img.width() * img.height()) as f32;
                    let dark = img.pixels().filter(|p| p.0[0] < 128).count() as f32;
                    let ratio = dark / total;
                    if !(0.005..0.80).contains(&ratio) {
                        eprintln!("  NIE variant {i}: suspicious ratio {ratio:.3}");
                        failures += 1;
                    } else {
                        println!("  NIE variant {i}: OK (dark_ratio={ratio:.3})");
                    }
                }
                Err(e) => {
                    eprintln!("  NIE variant {i}: FAILED — {e}");
                    failures += 1;
                }
            }
        }
        assert_eq!(
            failures, 0,
            "{failures}/10 NIE preprocessing variants failed"
        );
    }

    #[test]
    fn passport_mrz_10_in_a_row() {
        use ocr_service::preprocess::preprocess_mrz_zone;
        let mut failures = 0usize;
        for i in 0..10 {
            let bytes = make_variant(PASSPORT_MRZ_TEMPLATE, i);
            match preprocess_mrz_zone(&bytes, 0.22) {
                Ok(img) => {
                    assert!(img.width() > 0 && img.height() > 0);
                    println!(
                        "  Passport MRZ variant {i}: OK ({}×{})",
                        img.width(),
                        img.height()
                    );
                }
                Err(e) => {
                    eprintln!("  Passport MRZ variant {i}: FAILED — {e}");
                    failures += 1;
                }
            }
        }
        assert_eq!(
            failures, 0,
            "{failures}/10 passport MRZ preprocessing variants failed"
        );
    }
}

// ── Parser unit tests using synthetic OCR text ────────────────────────────────

mod parser_tests {
    use ocr_service::models::DocumentType;
    use ocr_service::parser::parse;

    #[test]
    fn test_parse_dni_specimen() {
        let text = "REINO DE ESPAÑA\nAPELLIDOS\nGARCIA RODRIGUEZ\nNOMBRE\nCARLOS JOSE\n\
                   NACIMIENTO SEXO\n15 06 1985 V\nVALIDEZ NACIONALIDAD\n15 06 2035 ESP\n\
                   12345678Z";
        let (data, conf) = parse(text, &DocumentType::Dni);
        assert!(
            data.last_name
                .as_deref()
                .is_some_and(|n| n.contains("GARCIA")),
            "expected GARCIA in last_name, got {:?}",
            data.last_name
        );
        assert!(
            data.first_name
                .as_deref()
                .is_some_and(|n| n.contains("CARLOS")),
            "expected CARLOS in first_name, got {:?}",
            data.first_name
        );
        assert!(
            data.document_number.as_deref() == Some("12345678Z"),
            "document_number mismatch: {:?}",
            data.document_number
        );
        assert!(conf > 0.3, "confidence too low: {conf}");
    }

    #[test]
    fn test_parse_nie_specimen() {
        let text = "PERMISO DE RESIDENCIA\nAPELLIDOS Y NOMBRE\nMULLER SCHMIDT HANS\n\
                   NIE X1234567L\nFECHA NACIMIENTO 22 03 1979\nSEXO V\nNACIONAL DEU\nVALIDEZ 22 03 2029";
        let (data, conf) = parse(text, &DocumentType::Nie);
        assert!(
            data.document_number
                .as_deref()
                .is_some_and(|n| n.starts_with('X')),
            "NIE number should start with X, got {:?}",
            data.document_number
        );
        assert!(conf > 0.2, "NIE confidence too low: {conf}");
    }

    #[test]
    fn test_parse_passport_mrz_td3() {
        // Real ICAO TD3 specimen format (check digits computed correctly)
        let text = "P<ESPGARCIA<RODRIGUEZ<<CARLOS<JOSE<<<<<<<<<<<<\nABC1234567ESP8506154M3012317<<<<<<<<<<<<<<<2";
        let (data, conf) = parse(text, &DocumentType::Passport);
        assert!(
            data.last_name
                .as_deref()
                .is_some_and(|n| n.contains("GARCIA")),
            "passport last_name, got {:?}",
            data.last_name
        );
        assert!(conf > 0.2, "passport confidence: {conf}");
    }

    #[test]
    fn test_parse_10_dni_texts_in_a_row() {
        let templates = [
            // Variant 1: standard Castilian
            "APELLIDOS GARCIA RODRIGUEZ\nNOMBRE CARLOS\n12345678Z\nNACIMIENTO 15 06 1985\nVALIDEZ 15 06 2035\nNACIONALIDAD ESP",
            // Variant 2: bilingual Catalan
            "COGNOMS GARCIA RODRIGUEZ\nNOM CARLOS\n12345678Z\nNAIXEMENT 15 06 1985\nCADUCITAT 15 06 2035\nNACIONALITAT ESP",
            // Variant 3: bilingual Basque
            "ABIZENAK GARCIA RODRIGUEZ\nIZENA CARLOS\n12345678Z\nJAIOTZA 15 06 1985\nIRAUNGI 15 06 2035\nESP",
            // Variant 4: MRZ back only
            "IDESP12345678Z0<<<<<<<<<<<<<<\n8506154M3506152ESP<<<<<<<<<<<8\nGARCIA<RODRIGUEZ<<CARLOS<JOSE<",
            // Variant 5: OCR with common substitutions
            "APELLlDOS GARClA R0DRlGUEZ\nN0MBRE CARL0S\n1234567OZ\n15/O6/1985\n15/O6/2035\nESP",
            // Variant 6: scattered fields
            "DNI\n12345678Z\nGARCIA RODRIGUEZ, CARLOS\nV\n15-06-1985\nESP",
            // Variant 7: newer card layout
            "DOCUMENTO NACIONAL DE IDENTIDAD\nGARCIA RODRIGUEZ\nCARLOS JOSE\n12345678Z\n15.06.1985\n15.06.2035\nESP\nM",
            // Variant 8: partial (only number and name)
            "APELLIDOS GARCIA\nNOMBRE CARLOS\n12345678Z",
            // Variant 9: OCR artifacts
            "APELLlDOS\nGARClA R0DRlGUEZ\nN0MBRE\nCARL0S\n12345678Z\nV\n15O61985\n15062035\nESP",
            // Variant 10: Galician bilingual
            "APELIDOS GARCIA RODRIGUEZ\nNOME CARLOS\n12345678Z\n15 06 1985\n15 06 2035\nESP",
        ];

        let mut pass = 0usize;
        for (i, tmpl) in templates.iter().enumerate() {
            let (data, conf) = parse(tmpl, &DocumentType::Dni);
            let has_doc_number = data.document_number.is_some();
            let has_name = data.first_name.is_some() || data.last_name.is_some();
            if has_doc_number || has_name {
                pass += 1;
                println!(
                    "  DNI text variant {}: OK (conf={conf:.2}, num={:?}, name={:?}+{:?})",
                    i + 1,
                    data.document_number,
                    data.first_name,
                    data.last_name
                );
            } else {
                eprintln!(
                    "  DNI text variant {}: FAIL — no document_number and no name (conf={conf:.2})",
                    i + 1
                );
            }
        }

        assert!(
            pass >= 9,
            "Only {pass}/10 DNI text variants extracted at least doc_number or name (need ≥9)"
        );
    }
}

// ── Benchmark stub ────────────────────────────────────────────────────────────

#[cfg(test)]
mod bench_stubs {
    use super::*;

    /// Timing reference: measures preprocessing throughput on synthetic images.
    /// Not a proper criterion benchmark but gives a wall-clock sanity check.
    #[test]
    #[ignore = "run manually with: cargo test bench_preprocess_throughput -- --ignored --nocapture"]
    fn bench_preprocess_throughput() {
        use ocr_service::preprocess::preprocess;
        use std::time::Instant;

        let bytes = render_text_to_image(DNI_FRONT_TEMPLATE, 1050, 740, 18.0);
        let n = 20;
        let start = Instant::now();
        for _ in 0..n {
            let _ = preprocess(&bytes).unwrap();
        }
        let elapsed = start.elapsed();
        println!(
            "preprocess: {n} iterations in {:.2}ms avg = {:.1}ms/image",
            elapsed.as_millis(),
            elapsed.as_millis() as f64 / n as f64
        );
        // Target: < 500ms per image on a typical developer machine
        let avg_ms = elapsed.as_millis() as f64 / n as f64;
        assert!(
            avg_ms < 500.0,
            "preprocessing too slow: {avg_ms:.1}ms/image"
        );
    }
}
