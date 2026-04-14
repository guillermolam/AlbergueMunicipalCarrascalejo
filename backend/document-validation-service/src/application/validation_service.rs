use crate::adapters::tesseract_ocr::TesseractOCR;
use crate::domain::image_classifier::EuIdClassifier;
use crate::domain::ocr::{ConfidenceScorer, ImageProcessor, TextExtractor};
use crate::domain::validators::dni_validator::DniValidator;
use crate::domain::validators::mrz_validator::MrzValidator;
use crate::domain::validators::nie_validator::NieValidator;
use crate::domain::validators::passport_validator::PassportValidator;
use crate::ports::ocr_client::OCRClient;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use shared::dto::{DocumentType, ExtractedData, ValidationRequest, ValidationResponse};
use shared::{AlbergueError, AlbergueResult};

/// Maximum raw (decoded) image size accepted: 10 MiB.
/// The base64-encoded string is ~33 % larger, so cap the encoded input at
/// `ceil(MAX_IMAGE_BYTES * 4 / 3)` ≈ 13.4 MiB.
const MAX_IMAGE_BYTES: usize = 10 * 1024 * 1024;
/// Pre-computed ceiling for encoded length to avoid floating-point math.
const MAX_B64_CHARS: usize = (MAX_IMAGE_BYTES * 4).div_ceil(3);

pub struct DocumentValidationService {
    ocr_client: TesseractOCR,
    _image_processor: ImageProcessor,
    _text_extractor: TextExtractor,
    _confidence_scorer: ConfidenceScorer,
    _dni_validator: DniValidator,
    _nie_validator: NieValidator,
    _passport_validator: PassportValidator,
    _mrz_validator: MrzValidator,
}

impl DocumentValidationService {
    pub fn new() -> Self {
        Self {
            ocr_client: TesseractOCR::new(),
            _image_processor: ImageProcessor::new(),
            _text_extractor: TextExtractor::new(),
            _confidence_scorer: ConfidenceScorer::new(),
            _dni_validator: DniValidator::new(),
            _nie_validator: NieValidator::new(),
            _passport_validator: PassportValidator::new(),
            _mrz_validator: MrzValidator::new(),
        }
    }

    pub async fn validate_document(
        &self,
        request: ValidationRequest,
    ) -> AlbergueResult<ValidationResponse> {
        // Guard: reject oversized encoded payloads before allocating decode buffers.
        if request.front_image.len() > MAX_B64_CHARS {
            return Err(AlbergueError::Validation {
                message: "front image exceeds maximum allowed size".to_string(),
            });
        }
        if let Some(back_b64) = &request.back_image {
            if back_b64.len() > MAX_B64_CHARS {
                return Err(AlbergueError::Validation {
                    message: "back image exceeds maximum allowed size".to_string(),
                });
            }
        }

        // Decode base64 images — use a generic error message so internal details
        // (e.g. exact base64 decode offset) are not exposed to callers.
        let front_image = STANDARD
            .decode(&request.front_image)
            .map_err(|_| AlbergueError::Validation {
                message: "Invalid front image data".to_string(),
            })?;

        // Secondary check after decode (base64 padding can inflate perceived length).
        if front_image.len() > MAX_IMAGE_BYTES {
            return Err(AlbergueError::Validation {
                message: "front image exceeds maximum allowed size".to_string(),
            });
        }

        let back_image = if let Some(back_b64) = &request.back_image {
            let decoded = STANDARD
                .decode(back_b64)
                .map_err(|_| AlbergueError::Validation {
                    message: "Invalid back image data".to_string(),
                })?;
            if decoded.len() > MAX_IMAGE_BYTES {
                return Err(AlbergueError::Validation {
                    message: "back image exceeds maximum allowed size".to_string(),
                });
            }
            Some(decoded)
        } else {
            None
        };

        // ── Step 1: Classify images before sending to OCR ────────────────────
        // EuIdClassifier runs in <5 ms (pure-Rust pixel analysis, no I/O).
        // It detects aspect ratio, MRZ zone presence, EU-flag rectangle and
        // skin-tone photo region so we can:
        //   a) Validate the image is a plausible document (not a selfie / blank)
        //   b) Auto-detect front vs back and warn on type mismatches
        //   c) Pass the correct doc-type hint to the OCR service for better accuracy
        let front_classification = EuIdClassifier::validate_and_classify(&front_image, None);
        if !front_classification.size_valid || !front_classification.format_valid {
            let errs = front_classification.errors.join("; ");
            return Err(AlbergueError::Validation {
                message: format!("Front image rejected: {errs}"),
            });
        }

        // Detect and warn if image looks like the wrong doc type
        let mut warnings: Vec<String> = Vec::new();
        if let Some(ref cls) = front_classification.classification {
            use crate::domain::image_classifier::DetectedDocType;
            let declared_label = match request.document_type {
                DocumentType::DNI => "DNI",
                DocumentType::NIE => "NIE",
                DocumentType::Passport => "PASSPORT",
            };
            let mismatch = match (&request.document_type, &cls.doc_type) {
                (DocumentType::Passport, DetectedDocType::EuIdCard) => true,
                (DocumentType::DNI | DocumentType::NIE, DetectedDocType::Passport) => true,
                _ => false,
            };
            if mismatch {
                warnings.push(format!(
                    "Declared document type ({declared_label}) does not match the image \
                     (detected: {:?}). Validation may be inaccurate.",
                    cls.doc_type,
                ));
            }
            if cls.confidence < 0.4 {
                warnings.push(
                    "Low image classification confidence — ensure the full document is visible \
                     and well-lit."
                        .to_string(),
                );
            }
        }

        // ── Step 2: Extract structured data via OCR service ──────────────────
        // Use `extract_structured` so we get the OCR service's already-parsed,
        // field-mapped result directly — no double-parsing with simpler regexes.
        let doc_type_hint = match request.document_type {
            DocumentType::DNI => "DNI",
            DocumentType::NIE => "NIE",
            DocumentType::Passport => "PASSPORT",
        };
        let front_ocr = self
            .ocr_client
            .extract_structured(&front_image, doc_type_hint)
            .await?;

        // For DNI/NIE the back carries the MRZ — merge its fields if provided.
        let extracted_data = if let Some(back_data) = &back_image {
            let back_ocr = self
                .ocr_client
                .extract_structured(back_data, doc_type_hint)
                .await?;
            // Merge: prefer back-side fields when back has better data
            // (MRZ fields on back are more reliable than OCZ on front for dates)
            merge_extracted(front_ocr.data, back_ocr.data)
        } else {
            front_ocr.data
        };

        let confidence_score = front_ocr.confidence;

        // Validate document
        let is_valid = self.validate_document_logic(&request.document_type, &extracted_data)?;

        Ok(ValidationResponse {
            is_valid,
            extracted_data,
            confidence_score,
            errors: warnings,
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
            DocumentType::NIE => {
                if let Some(doc_number) = &data.document_number {
                    self._nie_validator.validate_nie(doc_number)
                } else {
                    Ok(false)
                }
            }
            DocumentType::Passport => {
                if let Some(doc_number) = &data.document_number {
                    self._passport_validator.validate_passport(doc_number)
                } else {
                    Ok(false)
                }
            }
        }
    }

}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Merge front-side and back-side OCR results, preferring whichever side has
/// a non-None value for each field.  When both sides have a value, the back
/// side wins — for Spanish DNI/NIE the back carries the machine-readable MRZ
/// which is more reliable than OCR'd text on the front.
fn merge_extracted(front: ExtractedData, back: ExtractedData) -> ExtractedData {
    ExtractedData {
        document_number: back.document_number.or(front.document_number),
        name: front.name.or(back.name),              // Name is on the front
        surname: front.surname.or(back.surname),     // Surname is on the front
        birth_date: back.birth_date.or(front.birth_date),     // MRZ date preferred
        expiry_date: back.expiry_date.or(front.expiry_date),  // MRZ date preferred
        nationality: back.nationality.or(front.nationality),  // MRZ code preferred
    }
}
