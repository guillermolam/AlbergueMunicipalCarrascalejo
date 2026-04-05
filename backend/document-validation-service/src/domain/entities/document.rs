use chrono::{DateTime, Utc};
use shared::dto::{DocumentType, ExtractedData};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Document {
    pub id: Uuid,
    pub document_type: DocumentType,
    pub document_number: String,
    pub holder_name: String,
    pub holder_surname: String,
    pub birth_date: DateTime<Utc>,
    pub nationality: String,
    pub expiry_date: Option<DateTime<Utc>>,
    pub is_valid: bool,
    pub validation_timestamp: DateTime<Utc>,
}

impl Document {
    pub fn new(document_type: DocumentType, extracted_data: ExtractedData, is_valid: bool) -> Self {
        Self {
            id: Uuid::new_v4(),
            document_type,
            document_number: extracted_data.document_number.unwrap_or_default(),
            holder_name: extracted_data.name.unwrap_or_default(),
            holder_surname: extracted_data.surname.unwrap_or_default(),
            birth_date: extracted_data.birth_date.unwrap_or_else(Utc::now),
            nationality: extracted_data.nationality.unwrap_or_default(),
            expiry_date: extracted_data.expiry_date,
            is_valid,
            validation_timestamp: Utc::now(),
        }
    }

    pub fn is_expired(&self) -> bool {
        match self.expiry_date {
            Some(expiry) => expiry < Utc::now(),
            None => false,
        }
    }

    // Async method for comprehensive validation
    #[tracing::instrument(skip(self), fields(doc_type = ?self.document_type, doc_number = %self.document_number))]
    pub async fn validate_comprehensive(
        &self,
    ) -> Result<DocumentValidationResult, Box<dyn std::error::Error + Send + Sync>> {
        let validation_result = match self.document_type {
            DocumentType::DNI => {
                let checksum_valid = validate_dni_checksum_async(&self.document_number).await;
                let format_valid = validate_dni_format_async(&self.document_number).await;
                let expiry_valid = true; // DNI doesn't typically expire

                DocumentValidationResult {
                    is_valid: checksum_valid && format_valid && expiry_valid,
                    checksum_valid: Some(checksum_valid),
                    format_valid: Some(format_valid),
                    expiry_valid: Some(expiry_valid),
                    confidence: 0.95,
                    errors: if checksum_valid && format_valid {
                        vec![]
                    } else {
                        vec!["DNI validation failed".to_string()]
                    },
                }
            }
            DocumentType::NIE => {
                let checksum_valid = validate_nie_checksum_async(&self.document_number).await;
                let format_valid = validate_nie_format_async(&self.document_number).await;

                DocumentValidationResult {
                    is_valid: checksum_valid && format_valid,
                    checksum_valid: Some(checksum_valid),
                    format_valid: Some(format_valid),
                    expiry_valid: Some(!self.is_expired()),
                    confidence: 0.90,
                    errors: if checksum_valid && format_valid {
                        vec![]
                    } else {
                        vec!["NIE validation failed".to_string()]
                    },
                }
            }
            DocumentType::Passport => {
                let mrz_valid = true; // Simplified passport validation
                let expiry_valid = !self.is_expired();

                DocumentValidationResult {
                    is_valid: mrz_valid && expiry_valid,
                    checksum_valid: Some(mrz_valid),
                    format_valid: Some(true),
                    expiry_valid: Some(expiry_valid),
                    confidence: 0.88,
                    errors: vec![],
                }
            }
        };

        Ok(validation_result)
    }

    #[tracing::instrument(skip(self), fields(doc_type = ?self.document_type))]
    pub fn validate_checksum(&self) -> bool {
        match self.document_type {
            DocumentType::DNI => self.validate_dni_checksum(),
            DocumentType::NIE => self.validate_nie_checksum(),
            DocumentType::Passport => true, // Passport validation is different
        }
    }

    fn validate_dni_checksum(&self) -> bool {
        validate_dni_checksum_sync(&self.document_number)
    }

    fn validate_nie_checksum(&self) -> bool {
        validate_nie_checksum_sync(&self.document_number)
    }
}

#[derive(Debug, Clone)]
pub struct DocumentValidationResult {
    pub is_valid: bool,
    pub checksum_valid: Option<bool>,
    pub format_valid: Option<bool>,
    pub expiry_valid: Option<bool>,
    pub confidence: f64,
    pub errors: Vec<String>,
}

// Stateless pure function for DNI checksum validation (sync)
pub fn validate_dni_checksum_sync(dni: &str) -> bool {
    if dni.len() != 9 {
        return false;
    }

    let number_part = &dni[..8];
    let letter_part = &dni[8..];

    if let Ok(number) = number_part.parse::<u32>() {
        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = letters.chars().nth((number % 23) as usize);

        if let Some(expected) = expected_letter {
            return letter_part.starts_with(expected);
        }
    }

    false
}

// Async stateless function for DNI checksum validation
async fn validate_dni_checksum_async(dni: &str) -> bool {
    validate_dni_checksum_sync(dni)
}

// Async stateless function for DNI format validation
async fn validate_dni_format_async(dni: &str) -> bool {
    if dni.len() != 9 {
        return false;
    }

    let number_part = &dni[..8];
    let letter_part = &dni[8..];

    number_part.chars().all(|c| c.is_ascii_digit())
        && letter_part.chars().all(|c| c.is_ascii_alphabetic())
}

// Stateless pure function for NIE checksum validation (sync)
pub fn validate_nie_checksum_sync(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    // NIE format: X1234567L or Y1234567L
    let first_char = nie.chars().next().unwrap_or(' ');
    if first_char != 'X' && first_char != 'Y' {
        return false;
    }

    let number_part = &nie[1..8];
    let letter_part = &nie[8..];

    if let Ok(mut number) = number_part.parse::<u32>() {
        // X = 0, Y = 1
        if first_char == 'Y' {
            number += 10000000;
        }

        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = letters.chars().nth((number % 23) as usize);

        if let Some(expected) = expected_letter {
            return letter_part.starts_with(expected);
        }
    }

    false
}

// Async stateless function for NIE checksum validation
async fn validate_nie_checksum_async(nie: &str) -> bool {
    validate_nie_checksum_sync(nie)
}

// Async stateless function for NIE format validation
async fn validate_nie_format_async(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    let first_char = nie.chars().next().unwrap_or(' ');
    matches!(first_char, 'X' | 'Y' | 'Z')
}

// Async stateless function for sequential document validations
pub async fn validate_multiple_documents(
    documents: Vec<Document>,
) -> Result<Vec<DocumentValidationResult>, Box<dyn std::error::Error + Send + Sync>> {
    let mut results = Vec::with_capacity(documents.len());
    for doc in &documents {
        results.push(doc.validate_comprehensive().await?);
    }
    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    fn make_extracted_data(doc_number: &str) -> ExtractedData {
        ExtractedData {
            document_number: Some(doc_number.to_string()),
            name: Some("Juan".to_string()),
            surname: Some("Garcia".to_string()),
            birth_date: Some(Utc::now()),
            nationality: Some("ESP".to_string()),
            expiry_date: None,
        }
    }

    // --- Document::new tests ---

    #[test]
    fn test_document_new_sets_fields() {
        let data = make_extracted_data("12345678Z");
        let doc = Document::new(DocumentType::DNI, data, true);
        assert_eq!(doc.document_number, "12345678Z");
        assert_eq!(doc.holder_name, "Juan");
        assert_eq!(doc.holder_surname, "Garcia");
        assert!(doc.is_valid);
    }

    #[test]
    fn test_document_new_defaults_for_missing_fields() {
        let data = ExtractedData::default();
        let doc = Document::new(DocumentType::NIE, data, false);
        assert_eq!(doc.document_number, "");
        assert_eq!(doc.holder_name, "");
        assert!(!doc.is_valid);
    }

    // --- Document::is_expired tests ---

    #[test]
    fn test_document_not_expired_no_expiry() {
        let data = make_extracted_data("12345678Z");
        let doc = Document::new(DocumentType::DNI, data, true);
        assert!(!doc.is_expired());
    }

    #[test]
    fn test_document_not_expired_future_date() {
        let mut data = make_extracted_data("12345678Z");
        data.expiry_date = Some(Utc::now() + Duration::days(365));
        let doc = Document::new(DocumentType::DNI, data, true);
        assert!(!doc.is_expired());
    }

    #[test]
    fn test_document_expired_past_date() {
        let mut data = make_extracted_data("12345678Z");
        data.expiry_date = Some(Utc::now() - Duration::days(1));
        let doc = Document::new(DocumentType::DNI, data, true);
        assert!(doc.is_expired());
    }

    // --- DNI checksum sync tests ---

    #[test]
    fn test_dni_checksum_sync_valid() {
        // 12345678 % 23 = 14 -> 'Z'
        assert!(validate_dni_checksum_sync("12345678Z"));
    }

    #[test]
    fn test_dni_checksum_sync_valid_zero() {
        // 0 % 23 = 0 -> 'T'
        assert!(validate_dni_checksum_sync("00000000T"));
    }

    #[test]
    fn test_dni_checksum_sync_invalid() {
        assert!(!validate_dni_checksum_sync("12345678A"));
    }

    #[test]
    fn test_dni_checksum_sync_too_short() {
        assert!(!validate_dni_checksum_sync("12345Z"));
    }

    // --- NIE checksum sync tests ---

    #[test]
    fn test_nie_checksum_sync_valid_x() {
        // X0000000T => prefix=0, number=0000000, full=00000000, 0%23=0 -> 'T'
        assert!(validate_nie_checksum_sync("X0000000T"));
    }

    #[test]
    fn test_nie_checksum_sync_valid_y() {
        // Y0000000 => prefix=1, full number = 10000000, 10000000%23 = 10000000 mod 23
        // 10000000 / 23 = 434782 rem 14 -> index 14 = 'Z'
        assert!(validate_nie_checksum_sync("Y0000000Z"));
    }

    #[test]
    fn test_nie_checksum_sync_invalid_wrong_letter() {
        assert!(!validate_nie_checksum_sync("X0000000A"));
    }

    #[test]
    fn test_nie_checksum_sync_invalid_z_prefix() {
        // The sync validator only accepts X and Y (not Z)
        assert!(!validate_nie_checksum_sync("Z0000000T"));
    }

    #[test]
    fn test_nie_checksum_sync_too_short() {
        assert!(!validate_nie_checksum_sync("X123"));
    }

    // --- validate_comprehensive async tests ---

    #[tokio::test]
    async fn test_validate_comprehensive_dni_valid() {
        let data = make_extracted_data("12345678Z");
        let doc = Document::new(DocumentType::DNI, data, true);
        let result = doc.validate_comprehensive().await.unwrap();
        assert!(result.is_valid);
        assert_eq!(result.checksum_valid, Some(true));
        assert_eq!(result.format_valid, Some(true));
        assert!(result.errors.is_empty());
    }

    #[tokio::test]
    async fn test_validate_comprehensive_dni_invalid_checksum() {
        let data = make_extracted_data("12345678A");
        let doc = Document::new(DocumentType::DNI, data, true);
        let result = doc.validate_comprehensive().await.unwrap();
        assert!(!result.is_valid);
        assert_eq!(result.checksum_valid, Some(false));
    }

    #[tokio::test]
    async fn test_validate_comprehensive_passport_not_expired() {
        let mut data = make_extracted_data("ABC123456");
        data.expiry_date = Some(Utc::now() + Duration::days(365));
        let doc = Document::new(DocumentType::Passport, data, true);
        let result = doc.validate_comprehensive().await.unwrap();
        assert!(result.is_valid);
        assert_eq!(result.expiry_valid, Some(true));
    }

    #[tokio::test]
    async fn test_validate_comprehensive_passport_expired() {
        let mut data = make_extracted_data("ABC123456");
        data.expiry_date = Some(Utc::now() - Duration::days(1));
        let doc = Document::new(DocumentType::Passport, data, true);
        let result = doc.validate_comprehensive().await.unwrap();
        assert!(!result.is_valid);
        assert_eq!(result.expiry_valid, Some(false));
    }

    // --- validate_checksum method tests ---

    #[test]
    fn test_validate_checksum_dni() {
        let data = make_extracted_data("12345678Z");
        let doc = Document::new(DocumentType::DNI, data, true);
        assert!(doc.validate_checksum());
    }

    #[test]
    fn test_validate_checksum_passport_always_true() {
        let data = make_extracted_data("ABC123456");
        let doc = Document::new(DocumentType::Passport, data, true);
        assert!(doc.validate_checksum());
    }
}
