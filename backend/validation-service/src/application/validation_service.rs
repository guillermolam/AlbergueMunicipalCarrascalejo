use crate::adapters::tesseract_ocr::TesseractOCR;
use crate::domain::ocr::{ConfidenceScorer, ImageProcessor, TextExtractor};
use crate::domain::validators::dni_validator::DniValidator;
use crate::domain::validators::mrz_validator::MrzValidator;
use crate::domain::validators::nie_validator::NieValidator;
use crate::domain::validators::passport_validator::PassportValidator;
use crate::ports::ocr_client::OCRClient;
use shared::{
    AlbergueError, AlbergueResult, DocumentType, ExtractedData, ValidationRequest,
    ValidationResponse,
};
use std::collections::HashMap;

pub struct ValidationService {
    ocr_client: TesseractOCR,
    image_processor: ImageProcessor,
    text_extractor: TextExtractor,
    confidence_scorer: ConfidenceScorer,
    dni_validator: DniValidator,
    nie_validator: NieValidator,
    passport_validator: PassportValidator,
    mrz_validator: MrzValidator,
}

impl ValidationService {
    pub fn new() -> Self {
        Self {
            ocr_client: TesseractOCR::new(),
            image_processor: ImageProcessor::new(),
            text_extractor: TextExtractor::new(),
            confidence_scorer: ConfidenceScorer::new(),
            dni_validator: DniValidator::new(),
            nie_validator: NieValidator::new(),
            passport_validator: PassportValidator::new(),
            mrz_validator: MrzValidator::new(),
        }
    }

    pub async fn validate_document(
        &self,
        request: ValidationRequest,
    ) -> AlbergueResult<ValidationResponse> {
        // Decode base64 images
        let front_image =
            base64::decode(&request.front_image).map_err(|e| AlbergueError::Validation {
                message: format!("Invalid front image encoding: {}", e),
            })?;

        let back_image = if let Some(back_b64) = &request.back_image {
            Some(
                base64::decode(back_b64).map_err(|e| AlbergueError::Validation {
                    message: format!("Invalid back image encoding: {}", e),
                })?,
            )
        } else {
            None
        };

        // Perform OCR
        let front_text = self.ocr_client.extract_text(&front_image).await?;
        let back_text = if let Some(back_data) = &back_image {
            Some(self.ocr_client.extract_text(back_data).await?)
        } else {
            None
        };

        // Combine OCR text
        let combined_text = match back_text {
            Some(back) => format!("{} {}", front_text, back),
            None => front_text,
        };

        // Extract data based on document type
        let extracted_data = match request.document_type {
            DocumentType::DNI => DniValidator::extract_data_from_ocr(&combined_text)?,
            DocumentType::NIE => self.extract_nie_data(&combined_text)?,
            DocumentType::Passport => self.extract_passport_data(&combined_text)?,
        };

        // Validate document
        let is_valid = self.validate_document_logic(&request.document_type, &extracted_data)?;

        // Calculate confidence score
        let confidence_score = self.calculate_confidence(&extracted_data);

        Ok(ValidationResponse {
            is_valid,
            extracted_data,
            confidence_score,
            errors: vec![],
        })
    }

    fn extract_nie_data(&self, _ocr_text: &str) -> AlbergueResult<ExtractedData> {
        // Simplified NIE extraction - would be implemented similarly to DNI
        Ok(ExtractedData {
            document_number: None,
            name: None,
            surname: None,
            birth_date: None,
            nationality: None,
            expiry_date: None,
        })
    }

    fn extract_passport_data(&self, _ocr_text: &str) -> AlbergueResult<ExtractedData> {
        // Simplified passport extraction - would implement MRZ parsing
        Ok(ExtractedData {
            document_number: None,
            name: None,
            surname: None,
            birth_date: None,
            nationality: None,
            expiry_date: None,
        })
    }

    fn validate_document_logic(
        &self,
        doc_type: &DocumentType,
        data: &ExtractedData,
    ) -> AlbergueResult<bool> {
        match doc_type {
            DocumentType::DNI => {
                if let Some(doc_number) = &data.document_number {
                    Ok(DniValidator::validate_checksum(doc_number))
                } else {
                    Ok(false)
                }
            }
            DocumentType::NIE => Ok(true),      // Simplified
            DocumentType::Passport => Ok(true), // Simplified
        }
    }

    fn calculate_confidence(&self, data: &ExtractedData) -> f32 {
        let mut score = 0.0;
        let mut total_fields = 0.0;

        if data.document_number.is_some() {
            score += 1.0;
        }
        total_fields += 1.0;

        if data.name.is_some() {
            score += 1.0;
        }
        total_fields += 1.0;

        if data.surname.is_some() {
            score += 1.0;
        }
        total_fields += 1.0;

        if data.birth_date.is_some() {
            score += 1.0;
        }
        total_fields += 1.0;

        if total_fields > 0.0 {
            score / total_fields
        } else {
            0.0
        }
    }
}
