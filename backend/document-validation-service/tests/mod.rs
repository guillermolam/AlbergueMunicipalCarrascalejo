// document-validation-service integration tests
//
// Note: The service's lib.rs uses a flat module structure with Spin SDK.
// The internal `application`, `domain`, etc. modules are not re-exported
// as pub from lib.rs, so external tests exercise the public API only.

#[cfg(test)]
mod training_data_structure_tests {
    use std::path::Path;

    // Test loading training data from ocr-training directory
    #[test]
    fn test_training_data_structure() {
        let dni_path = Path::new("tests/ocr-training/dni-nif");
        let nie_path = Path::new("tests/ocr-training/nie-tie");
        let passport_path = Path::new("tests/ocr-training/passports");

        assert!(
            dni_path.exists(),
            "DNI training data directory should exist"
        );
        assert!(
            nie_path.exists(),
            "NIE training data directory should exist"
        );
        assert!(
            passport_path.exists(),
            "Passport training data directory should exist"
        );
    }
}
