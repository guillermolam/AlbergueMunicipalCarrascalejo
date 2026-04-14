use shared::dto::ExtractedData;
use shared::AlbergueResult;

/// Structured OCR result — the mapped, validated output from the OCR service.
/// `data` carries the parsed document fields already mapped to the shared DTO.
/// `confidence` is the OCR engine's confidence in the overall extraction (0–1).
pub struct StructuredOcrResult {
    pub data: ExtractedData,
    pub confidence: f32,
}

#[async_trait::async_trait(?Send)]
pub trait OCRClient {
    /// Raw text extraction — kept for backwards compatibility / fallback paths.
    async fn extract_text(&self, image_data: &[u8]) -> AlbergueResult<String>;

    /// Text extraction with confidence score.
    async fn extract_text_with_confidence(
        &self,
        image_data: &[u8],
    ) -> AlbergueResult<(String, f32)>;

    /// Structured extraction — returns parsed, field-mapped data directly from
    /// the OCR service response.  Avoids the double-parse that happens when
    /// `extract_text` is used and the caller re-parses with inferior regexes.
    ///
    /// `doc_type_hint` is the declared document type ("DNI" | "NIE" | "PASSPORT")
    /// and is forwarded to the OCR service to improve accuracy.
    async fn extract_structured(
        &self,
        image_data: &[u8],
        doc_type_hint: &str,
    ) -> AlbergueResult<StructuredOcrResult>;
}
