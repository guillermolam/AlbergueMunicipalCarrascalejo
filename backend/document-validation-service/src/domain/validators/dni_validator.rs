use chrono::NaiveDate;
use regex::Regex;
use shared::dto::ExtractedData;
use shared::AlbergueResult;

pub struct DniValidator;

impl DniValidator {
    pub fn new() -> Self {
        Self
    }
}

impl DniValidator {
    #[tracing::instrument(skip_all)]
    pub fn validate_format(document_number: &str) -> bool {
        let dni_regex = Regex::new(r"^\d{8}[A-Z]$").unwrap();
        dni_regex.is_match(document_number)
    }

    #[tracing::instrument(skip_all)]
    pub fn validate_checksum(document_number: &str) -> bool {
        if document_number.len() != 9 {
            return false;
        }

        let number_part = &document_number[..8];
        let letter_part = &document_number[8..];

        if let Ok(number) = number_part.parse::<u32>() {
            let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
            let expected_letter = letters.chars().nth((number % 23) as usize);

            if let Some(expected) = expected_letter {
                return letter_part.starts_with(expected);
            }
        }

        false
    }

    #[tracing::instrument(skip_all)]
    pub fn extract_data_from_ocr(ocr_text: &str) -> AlbergueResult<ExtractedData> {
        let mut extracted = ExtractedData {
            document_number: None,
            name: None,
            surname: None,
            birth_date: None,
            nationality: Some("ESP".to_string()),
            expiry_date: None,
        };

        // Extract DNI number
        let dni_regex = Regex::new(r"\b\d{8}[A-Z]\b").unwrap();
        if let Some(captures) = dni_regex.find(ocr_text) {
            extracted.document_number = Some(captures.as_str().to_string());
        }

        // Extract name and surname (simplified pattern)
        let name_regex = Regex::new(r"(?i)nombre[:\s]+([A-ZÁÉÍÓÚÑ\s]+)").unwrap();
        if let Some(captures) = name_regex.captures(ocr_text) {
            if let Some(name_match) = captures.get(1) {
                let full_name = name_match.as_str().trim();
                let parts: Vec<&str> = full_name.split_whitespace().collect();
                if !parts.is_empty() {
                    extracted.name = Some(parts[0].to_string());
                    if parts.len() > 1 {
                        extracted.surname = Some(parts[1..].join(" "));
                    }
                }
            }
        }

        // Extract birth date
        let birth_regex =
            Regex::new(r"(?i)(?:nacimiento|born)[:\s]+(\d{2})[/\-.](\d{2})[/\-.](\d{4})").unwrap();
        if let Some(captures) = birth_regex.captures(ocr_text) {
            if let (Ok(day), Ok(month), Ok(year)) = (
                captures[1].parse::<u32>(),
                captures[2].parse::<u32>(),
                captures[3].parse::<i32>(),
            ) {
                if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
                    extracted.birth_date = Some(naive_date.and_hms_opt(0, 0, 0).unwrap().and_utc());
                }
            }
        }

        Ok(extracted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- validate_format tests ---

    #[test]
    fn test_format_valid_dni() {
        assert!(DniValidator::validate_format("12345678Z"));
    }

    #[test]
    fn test_format_valid_all_zeros() {
        assert!(DniValidator::validate_format("00000000T"));
    }

    #[test]
    fn test_format_invalid_lowercase_letter() {
        assert!(!DniValidator::validate_format("12345678z"));
    }

    #[test]
    fn test_format_invalid_no_letter() {
        assert!(!DniValidator::validate_format("123456789"));
    }

    #[test]
    fn test_format_invalid_too_few_digits() {
        assert!(!DniValidator::validate_format("1234567Z"));
    }

    #[test]
    fn test_format_invalid_letters_in_digits() {
        assert!(!DniValidator::validate_format("1234A678Z"));
    }

    // --- validate_checksum tests ---

    #[test]
    fn test_checksum_valid_12345678z() {
        assert!(DniValidator::validate_checksum("12345678Z"));
    }

    #[test]
    fn test_checksum_valid_00000000t() {
        assert!(DniValidator::validate_checksum("00000000T"));
    }

    #[test]
    fn test_checksum_valid_00000001r() {
        // 1 % 23 = 1 -> 'R'
        assert!(DniValidator::validate_checksum("00000001R"));
    }

    #[test]
    fn test_checksum_invalid_wrong_letter() {
        assert!(!DniValidator::validate_checksum("12345678A"));
    }

    #[test]
    fn test_checksum_empty_string() {
        assert!(!DniValidator::validate_checksum(""));
    }

    // --- extract_data_from_ocr tests ---

    #[test]
    fn test_extract_dni_number_from_text() {
        let text = "DNI 12345678Z NOMBRE: JUAN";
        let data = DniValidator::extract_data_from_ocr(text).unwrap();
        assert_eq!(data.document_number, Some("12345678Z".to_string()));
    }

    #[test]
    fn test_extract_name_from_text() {
        let text = "NOMBRE: JUAN GARCIA";
        let data = DniValidator::extract_data_from_ocr(text).unwrap();
        assert_eq!(data.name, Some("JUAN".to_string()));
        assert_eq!(data.surname, Some("GARCIA".to_string()));
    }

    #[test]
    fn test_extract_birth_date_from_text() {
        let text = "Nacimiento: 15/06/1990";
        let data = DniValidator::extract_data_from_ocr(text).unwrap();
        assert!(data.birth_date.is_some());
        let date = data.birth_date.unwrap();
        assert_eq!(date.format("%Y-%m-%d").to_string(), "1990-06-15");
    }

    #[test]
    fn test_extract_nationality_default_esp() {
        let text = "some text";
        let data = DniValidator::extract_data_from_ocr(text).unwrap();
        assert_eq!(data.nationality, Some("ESP".to_string()));
    }
}
