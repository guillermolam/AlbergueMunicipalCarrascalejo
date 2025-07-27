use crate::ports::ocr_client::OCRClient;
use shared::{AlbergueError, AlbergueResult};

pub struct TesseractOCR;

impl TesseractOCR {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait(?Send)]
impl OCRClient for TesseractOCR {
    async fn extract_text(&self, image_data: &[u8]) -> AlbergueResult<String> {
        // For WASM, we'll use a simplified OCR simulation
        // In a real implementation, this would use tesseract-rs or call external OCR service

        // Simulate OCR processing delay
        wasm_bindgen_futures::JsFuture::from(js_sys::Promise::resolve(
            &wasm_bindgen::JsValue::from(42),
        ))
        .await
        .map_err(|_| AlbergueError::OCRProcessing {
            message: "OCR processing failed".to_string(),
        })?;

        // Mock OCR result for DNI
        let mock_text = if image_data.len() > 1000 {
            "DNI\nNombre: JUAN\nApellidos: GARCIA LOPEZ\nNacimiento: 15/06/1985\n12345678A\nESP"
        } else {
            "DNI\n12345678A"
        };

        Ok(mock_text.to_string())
    }

    async fn extract_text_with_confidence(
        &self,
        image_data: &[u8],
    ) -> AlbergueResult<(String, f32)> {
        let text = self.extract_text(image_data).await?;
        let confidence = if text.len() > 20 { 0.9 } else { 0.6 };
        Ok((text, confidence))
    }
}
