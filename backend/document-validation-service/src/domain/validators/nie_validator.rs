use chrono::{DateTime, NaiveDate, Utc};
use regex::Regex;
use shared::dto::ExtractedData;
use shared::AlbergueResult;

pub struct NieValidator;

impl NieValidator {
    pub fn new() -> Self {
        Self
    }

    #[tracing::instrument(skip(self), fields(nie = %nie_number))]
    pub fn validate_nie(&self, nie_number: &str) -> AlbergueResult<bool> {
        // NIE format: Letter (X,Y,Z) + 7 digits + control letter
        let nie_regex = Regex::new(r"^[XYZ]\d{7}[A-Z]$").unwrap();

        if !nie_regex.is_match(nie_number) {
            return Ok(false);
        }

        // Calculate control letter
        let first_char = nie_number.chars().next().unwrap();
        let number_part = &nie_number[1..8];

        let prefix = match first_char {
            'X' => 0,
            'Y' => 1,
            'Z' => 2,
            _ => return Ok(false),
        };

        let number: u32 = format!("{}{}", prefix, number_part).parse().unwrap_or(0);
        let remainder = number % 23;

        let control_letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = control_letters.chars().nth(remainder as usize).unwrap();
        let actual_letter = nie_number.chars().last().unwrap();

        Ok(expected_letter == actual_letter)
    }

    #[tracing::instrument(skip(self))]
    pub fn extract_nie_data(&self, nie_text: &str) -> AlbergueResult<ExtractedData> {
        let nie_regex = Regex::new(r"([XYZ]\d{7}[A-Z])").unwrap();

        let mut extracted = ExtractedData::default();

        if let Some(captures) = nie_regex.captures(nie_text) {
            extracted.document_number = Some(captures[1].to_string());
        }

        // Extract name patterns (Spanish NIE format)
        let name_regex = Regex::new(r"(?i)nombre[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = name_regex.captures(nie_text) {
            extracted.name = Some(captures[1].trim().to_string());
        }

        // Extract surnames
        let surname_regex = Regex::new(r"(?i)apellidos[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = surname_regex.captures(nie_text) {
            extracted.surname = Some(captures[1].trim().to_string());
        }

        // Extract birth date
        let date_regex = Regex::new(r"(\d{2})[/.-](\d{2})[/.-](\d{4})").unwrap();
        if let Some(captures) = date_regex.captures(nie_text) {
            let day: u32 = captures[1].parse().unwrap_or(1);
            let month: u32 = captures[2].parse().unwrap_or(1);
            let year: i32 = captures[3].parse().unwrap_or(1900);

            if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
                extracted.birth_date = Some(DateTime::from_naive_utc_and_offset(
                    naive_date.and_hms_opt(0, 0, 0).unwrap(),
                    Utc,
                ));
            }
        }

        // Extract nationality for NIE documents
        let nationality_regex = Regex::new(r"(?i)nacionalidad[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = nationality_regex.captures(nie_text) {
            extracted.nationality = Some(captures[1].trim().to_string());
        }

        Ok(extracted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn validator() -> NieValidator {
        NieValidator::new()
    }

    // --- validate_nie tests ---

    #[test]
    fn test_valid_nie_x_prefix() {
        // X0000000T => prefix 0, number 00000000, 0%23=0 -> 'T'
        assert!(validator().validate_nie("X0000000T").unwrap());
    }

    #[test]
    fn test_valid_nie_y_prefix() {
        // Y0000000 => prefix 1, full = 10000000, 10000000%23=14 -> 'Z'
        assert!(validator().validate_nie("Y0000000Z").unwrap());
    }

    #[test]
    fn test_valid_nie_z_prefix() {
        // Z0000000 => prefix 2, full = 20000000, 20000000%23 = 20000000 mod 23
        // 20000000 / 23 = 869565 rem 5 -> index 5 = 'M'
        assert!(validator().validate_nie("Z0000000M").unwrap());
    }

    #[test]
    fn test_invalid_nie_wrong_checksum() {
        assert!(!validator().validate_nie("X0000000A").unwrap());
    }

    #[test]
    fn test_invalid_nie_bad_prefix() {
        assert!(!validator().validate_nie("A1234567Z").unwrap());
    }

    #[test]
    fn test_invalid_nie_too_short() {
        assert!(!validator().validate_nie("X123").unwrap());
    }

    #[test]
    fn test_invalid_nie_lowercase() {
        assert!(!validator().validate_nie("x0000000T").unwrap());
    }

    // --- extract_nie_data tests ---

    #[test]
    fn test_extract_nie_number() {
        let text = "NIE: X1234567A datos personales";
        let data = validator().extract_nie_data(text).unwrap();
        assert_eq!(data.document_number, Some("X1234567A".to_string()));
    }

    #[test]
    fn test_extract_nie_name() {
        let text = "Nombre: MARIA";
        let data = validator().extract_nie_data(text).unwrap();
        assert_eq!(data.name, Some("MARIA".to_string()));
    }

    #[test]
    fn test_extract_nie_date() {
        let text = "Fecha: 01/06/1985";
        let data = validator().extract_nie_data(text).unwrap();
        assert!(data.birth_date.is_some());
    }

    #[test]
    fn test_extract_nie_nationality() {
        let text = "Nacionalidad: FRANCESA";
        let data = validator().extract_nie_data(text).unwrap();
        assert_eq!(data.nationality, Some("FRANCESA".to_string()));
    }
}
