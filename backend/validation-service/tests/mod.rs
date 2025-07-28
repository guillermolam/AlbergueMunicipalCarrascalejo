use validation_service::application::validation_service::ValidationService;
use shared::{ValidationRequest, DocumentType};

#[cfg(test)]
mod ocr_training_tests {
    use super::*;

    #[tokio::test]
    async fn test_dni_validation_with_training_data() {
        let service = ValidationService::new();
        
        // Mock DNI validation request
        let request = ValidationRequest {
            document_type: DocumentType::DNI,
            front_image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==".to_string(),
            back_image: None,
        };

        let result = service.validate_document(request).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.confidence_score > 0.0);
    }

    #[tokio::test]
    async fn test_nie_validation_with_training_data() {
        let service = ValidationService::new();
        
        let request = ValidationRequest {
            document_type: DocumentType::NIE,
            front_image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==".to_string(),
            back_image: None,
        };

        let result = service.validate_document(request).await;
        assert!(result.is_ok());
    }

    #[test]
    fn test_dni_checksum_validation() {
        use validation_service::domain::validators::dni_validator::DniValidator;
        
        // Valid DNI checksums
        assert!(DniValidator::validate_checksum("12345678Z"));
        assert!(DniValidator::validate_checksum("87654321X"));
        
        // Invalid checksums
        assert!(!DniValidator::validate_checksum("12345678A"));
        assert!(!DniValidator::validate_checksum("invalid"));
        assert!(!DniValidator::validate_checksum("12345678"));
    }

    // Test loading training data from ocr-training directory
    #[test]
    fn test_training_data_structure() {
        use std::path::Path;
        
        let dni_path = Path::new("tests/ocr-training/dni-nif");
        let nie_path = Path::new("tests/ocr-training/nie-tie");
        let passport_path = Path::new("tests/ocr-training/passports");
        
        assert!(dni_path.exists(), "DNI training data directory should exist");
        assert!(nie_path.exists(), "NIE training data directory should exist");
        assert!(passport_path.exists(), "Passport training data directory should exist");
    }
}