use chrono::{DateTime, NaiveDate, Utc};
use regex::Regex;
use shared::{AlbergueError, AlbergueResult, ExtractedData};

pub struct DniValidator;

impl DniValidator {
    pub fn new() -> Self {
        Self
    }
}

impl DniValidator {
    pub fn validate_format(document_number: &str) -> bool {
        let dni_regex = Regex::new(r"^\d{8}[A-Z]$").unwrap();
        dni_regex.is_match(document_number)
    }

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
                return letter_part.chars().next() == Some(expected);
            }
        }

        false
    }

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
