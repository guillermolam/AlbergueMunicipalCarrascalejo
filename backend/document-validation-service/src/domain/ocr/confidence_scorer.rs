use shared::AlbergueResult;
use std::collections::HashMap;

pub struct ConfidenceScorer;

impl ConfidenceScorer {
    pub fn new() -> Self {
        Self
    }

    pub fn calculate_field_confidence(
        &self,
        field_name: &str,
        extracted_value: &str,
        context: &str,
    ) -> f32 {
        match field_name {
            "document_number" => self.score_document_number(extracted_value),
            "name" | "surname" => self.score_name_field(extracted_value),
            "birth_date" | "expiry_date" => self.score_date_field(extracted_value),
            "nationality" => self.score_nationality_field(extracted_value),
            _ => 0.5, // Default confidence for unknown fields
        }
    }

    pub fn calculate_overall_confidence(&self, field_scores: &HashMap<String, f32>) -> f32 {
        if field_scores.is_empty() {
            return 0.0;
        }

        let sum: f32 = field_scores.values().sum();
        let count = field_scores.len() as f32;

        // Weighted average with bonus for having key fields
        let base_score = sum / count;
        let key_fields_bonus = self.calculate_key_fields_bonus(field_scores);

        (base_score + key_fields_bonus).min(1.0)
    }

    fn score_document_number(&self, value: &str) -> f32 {
        use regex::Regex;

        // DNI format: 8 digits + letter
        if let Ok(dni_regex) = Regex::new(r"^\d{8}[A-Z]$") {
            if dni_regex.is_match(value) {
                return self.validate_dni_checksum(value);
            }
        }

        // NIE format: Letter + 7 digits + letter
        if let Ok(nie_regex) = Regex::new(r"^[XYZ]\d{7}[A-Z]$") {
            if nie_regex.is_match(value) {
                return 0.9; // High confidence for proper NIE format
            }
        }

        // Passport format: 3 letters + 6 digits
        if let Ok(passport_regex) = Regex::new(r"^[A-Z]{3}\d{6}$") {
            if passport_regex.is_match(value) {
                return 0.85; // High confidence for proper passport format
            }
        }

        // Partial matches get lower scores
        if value.len() >= 8 && value.chars().any(|c| c.is_alphanumeric()) {
            return 0.3;
        }

        0.1
    }

    fn validate_dni_checksum(&self, dni: &str) -> f32 {
        if dni.len() != 9 {
            return 0.1;
        }

        let number_part = &dni[0..8];
        let letter = dni.chars().last().unwrap();

        if let Ok(number) = number_part.parse::<u32>() {
            let remainder = number % 23;
            let control_letters = "TRWAGMYFPDXBNJZSQVHLCKE";
            let expected_letter = control_letters.chars().nth(remainder as usize).unwrap();

            if expected_letter == letter {
                return 0.95; // Very high confidence for valid checksum
            }
        }

        0.2 // Low confidence if checksum doesn't match
    }

    fn score_name_field(&self, value: &str) -> f32 {
        // Check for valid name patterns
        let cleaned = value.trim();

        if cleaned.is_empty() {
            return 0.0;
        }

        // Names should be mostly letters
        let letter_ratio =
            cleaned.chars().filter(|c| c.is_alphabetic()).count() as f32 / cleaned.len() as f32;

        if letter_ratio > 0.8 {
            // Additional checks for Spanish name patterns
            if cleaned
                .chars()
                .all(|c| c.is_alphabetic() || c == ' ' || "ÁÉÍÓÚÑÜ".contains(c))
            {
                return 0.9;
            }
            return 0.7;
        }

        0.3
    }

    fn score_date_field(&self, value: &str) -> f32 {
        use regex::Regex;

        // Check for common date formats
        let date_patterns = [
            r"^\d{2}/\d{2}/\d{4}$",   // DD/MM/YYYY
            r"^\d{2}-\d{2}-\d{4}$",   // DD-MM-YYYY
            r"^\d{2}\.\d{2}\.\d{4}$", // DD.MM.YYYY
            r"^\d{4}-\d{2}-\d{2}$",   // YYYY-MM-DD
        ];

        for pattern in &date_patterns {
            if let Ok(regex) = Regex::new(pattern) {
                if regex.is_match(value) {
                    return self.validate_date_logic(value);
                }
            }
        }

        0.1
    }

    fn validate_date_logic(&self, date_str: &str) -> f32 {
        // Extract day, month, year and validate logical ranges
        let parts: Vec<&str> = date_str
            .split(|c| c == '/' || c == '-' || c == '.')
            .collect();

        if parts.len() != 3 {
            return 0.2;
        }

        if let (Ok(day), Ok(month), Ok(year)) = (
            parts[0].parse::<u32>(),
            parts[1].parse::<u32>(),
            parts[2].parse::<u32>(),
        ) {
            if day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100 {
                return 0.9;
            }
        }

        0.3
    }

    fn score_nationality_field(&self, value: &str) -> f32 {
        let cleaned = value.trim().to_uppercase();

        // Common nationalities in Spanish documents
        let common_nationalities = [
            "ESPAÑOLA",
            "ESPAÑOLA",
            "FRANCESA",
            "ALEMANA",
            "ITALIANA",
            "PORTUGUESA",
            "BRITÁNICA",
            "IRLANDESA",
            "HOLANDESA",
            "BELGA",
            "SUIZA",
            "AUSTRIACA",
            "POLACA",
            "CHECA",
            "HÚNGARA",
            "AMERICANA",
            "CANADIENSE",
            "AUSTRALIANA",
            "JAPONESA",
            "COREANA",
            "BRASILEÑA",
            "ARGENTINA",
            "CHILENA",
            "MEXICANA",
        ];

        if common_nationalities.contains(&cleaned.as_str()) {
            return 0.95;
        }

        // Check if it looks like a nationality (mostly letters, reasonable length)
        if cleaned.len() >= 4
            && cleaned.len() <= 20
            && cleaned.chars().all(|c| c.is_alphabetic() || c == ' ')
        {
            return 0.7;
        }

        0.2
    }

    fn calculate_key_fields_bonus(&self, field_scores: &HashMap<String, f32>) -> f32 {
        let key_fields = ["document_number", "name", "surname"];
        let mut bonus = 0.0;

        for field in &key_fields {
            if let Some(score) = field_scores.get(*field) {
                if *score > 0.7 {
                    bonus += 0.05; // Small bonus for each high-confidence key field
                }
            }
        }

        bonus
    }

    pub fn suggest_improvements(&self, field_scores: &HashMap<String, f32>) -> Vec<String> {
        let mut suggestions = Vec::new();

        for (field, score) in field_scores {
            if *score < 0.5 {
                match field.as_str() {
                    "document_number" => suggestions
                        .push("Document number may be unclear - try better lighting".to_string()),
                    "name" | "surname" => {
                        suggestions.push(format!("{} field may need manual verification", field))
                    }
                    "birth_date" | "expiry_date" => {
                        suggestions.push(format!("{} format unclear - verify manually", field))
                    }
                    _ => suggestions.push(format!("{} field has low confidence", field)),
                }
            }
        }

        if suggestions.is_empty() {
            suggestions.push("All fields extracted with good confidence".to_string());
        }

        suggestions
    }
}
