use image::{DynamicImage, GenericImageView, ImageBuffer, ImageFormat};
use shared::AlbergueResult;
use std::io::Cursor;

pub struct ImageProcessor;

impl ImageProcessor {
    pub fn new() -> Self {
        Self
    }

    pub fn preprocess_document_image(&self, image_data: &[u8]) -> AlbergueResult<Vec<u8>> {
        let img =
            image::load_from_memory(image_data).map_err(|e| shared::AlbergueError::Validation {
                message: format!("Failed to load image: {}", e),
            })?;

        // Convert to grayscale for better OCR
        let gray_img = img.to_luma8();

        // Apply contrast enhancement
        let enhanced = self.enhance_contrast(&gray_img);

        // Detect and correct orientation
        let corrected = self.correct_orientation(enhanced)?;

        // Convert back to bytes
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);
        corrected
            .write_to(&mut cursor, ImageFormat::Png)
            .map_err(|e| shared::AlbergueError::Validation {
                message: format!("Failed to encode image: {}", e),
            })?;

        Ok(buffer)
    }

    fn enhance_contrast(&self, img: &image::GrayImage) -> DynamicImage {
        // Simple contrast enhancement - can be improved with histogram equalization
        let (width, height) = img.dimensions();
        let mut enhanced = ImageBuffer::new(width, height);

        for (x, y, pixel) in img.enumerate_pixels() {
            let gray_value = pixel[0];
            // Apply simple contrast stretching
            let enhanced_value = ((gray_value as f32 - 128.0) * 1.2 + 128.0)
                .max(0.0)
                .min(255.0) as u8;
            enhanced.put_pixel(x, y, image::Luma([enhanced_value]));
        }

        DynamicImage::ImageLuma8(enhanced)
    }

    fn correct_orientation(&self, img: DynamicImage) -> AlbergueResult<DynamicImage> {
        // Simple orientation detection based on text line analysis
        // In a real implementation, this would use more sophisticated algorithms

        // For now, return the image as-is
        // TODO: Implement Hough line detection for document orientation
        Ok(img)
    }

    pub fn extract_document_regions(&self, image_data: &[u8]) -> AlbergueResult<Vec<Vec<u8>>> {
        let img =
            image::load_from_memory(image_data).map_err(|e| shared::AlbergueError::Validation {
                message: format!("Failed to load image: {}", e),
            })?;

        // For now, return the full image as a single region
        // TODO: Implement document region detection (text blocks, photos, etc.)
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);
        img.write_to(&mut cursor, ImageFormat::Png).map_err(|e| {
            shared::AlbergueError::Validation {
                message: format!("Failed to encode image: {}", e),
            }
        })?;

        Ok(vec![buffer])
    }

    pub fn detect_document_type(&self, image_data: &[u8]) -> AlbergueResult<String> {
        // Analyze image dimensions and layout to detect document type
        let img =
            image::load_from_memory(image_data).map_err(|e| shared::AlbergueError::Validation {
                message: format!("Failed to load image: {}", e),
            })?;

        let (width, height) = img.dimensions();
        let aspect_ratio = width as f32 / height as f32;

        // Basic heuristics for document type detection
        if aspect_ratio > 1.5 && aspect_ratio < 1.7 {
            Ok("dni".to_string()) // Spanish ID card ratio
        } else if aspect_ratio > 0.6 && aspect_ratio < 0.7 {
            Ok("passport".to_string()) // Passport page ratio
        } else {
            Ok("unknown".to_string())
        }
    }
}
