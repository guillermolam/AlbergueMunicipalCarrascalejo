use chrono::{DateTime, Utc};
use shared::{DocumentType, ExtractedData};
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
            birth_date: extracted_data.birth_date.unwrap_or_else(|| Utc::now()),
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

    pub fn validate_checksum(&self) -> bool {
        match self.document_type {
            DocumentType::DNI => self.validate_dni_checksum(),
            DocumentType::NIE => self.validate_nie_checksum(),
            DocumentType::Passport => true, // Passport validation is different
        }
    }

    fn validate_dni_checksum(&self) -> bool {
        if self.document_number.len() != 9 {
            return false;
        }

        let number_part = &self.document_number[..8];
        let letter_part = &self.document_number[8..];

        if let Ok(number) = number_part.parse::<u32>() {
            let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
            let expected_letter = letters.chars().nth((number % 23) as usize);

            if let Some(expected) = expected_letter {
                return letter_part.chars().next() == Some(expected);
            }
        }

        false
    }

    fn validate_nie_checksum(&self) -> bool {
        if self.document_number.len() != 9 {
            return false;
        }

        // NIE format: X1234567L or Y1234567L
        let first_char = self.document_number.chars().next().unwrap_or(' ');
        if first_char != 'X' && first_char != 'Y' {
            return false;
        }

        let number_part = &self.document_number[1..8];
        let letter_part = &self.document_number[8..];

        if let Ok(mut number) = number_part.parse::<u32>() {
            // X = 0, Y = 1
            if first_char == 'Y' {
                number += 10000000;
            }

            let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
            let expected_letter = letters.chars().nth((number % 23) as usize);

            if let Some(expected) = expected_letter {
                return letter_part.chars().next() == Some(expected);
            }
        }

        false
    }
}
