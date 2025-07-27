use shared::AlbergueResult;

pub struct TextExtractor;

impl TextExtractor {
    pub fn new() -> Self {
        Self
    }

    pub fn extract_text_from_image(&self, image_data: &[u8]) -> AlbergueResult<String> {
        // In a real implementation, this would use tesseract or similar OCR library
        // For now, return mock extracted text for testing

        // Simulate OCR extraction based on image analysis
        let text = self.simulate_ocr_extraction(image_data)?;
        Ok(text)
    }

    pub fn extract_structured_data(
        &self,
        text: &str,
        document_type: &str,
    ) -> AlbergueResult<std::collections::HashMap<String, String>> {
        let mut structured_data = std::collections::HashMap::new();

        match document_type {
            "dni" => self.extract_dni_fields(text, &mut structured_data),
            "nie" => self.extract_nie_fields(text, &mut structured_data),
            "passport" => self.extract_passport_fields(text, &mut structured_data),
            _ => {}
        }

        Ok(structured_data)
    }

    fn simulate_ocr_extraction(&self, _image_data: &[u8]) -> AlbergueResult<String> {
        // This would normally use tesseract-rs or similar
        // For now, return a sample extraction to test the pipeline
        Ok("MINISTERIO DEL INTERIOR\nDNI\n12345678Z\nNOMBRE: JUAN\nAPELLIDOS: GARCIA MARTINEZ\nFECHA NAC: 15/06/1990\nNACIONALIDAD: ESPAÑOLA".to_string())
    }

    fn extract_dni_fields(&self, text: &str, data: &mut std::collections::HashMap<String, String>) {
        use regex::Regex;

        // Extract DNI number
        if let Ok(dni_regex) = Regex::new(r"(\d{8}[A-Z])") {
            if let Some(captures) = dni_regex.captures(text) {
                data.insert("document_number".to_string(), captures[1].to_string());
            }
        }

        // Extract name
        if let Ok(name_regex) = Regex::new(r"(?i)nombre[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)") {
            if let Some(captures) = name_regex.captures(text) {
                data.insert("name".to_string(), captures[1].trim().to_string());
            }
        }

        // Extract surnames
        if let Ok(surname_regex) = Regex::new(r"(?i)apellidos[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)") {
            if let Some(captures) = surname_regex.captures(text) {
                data.insert("surname".to_string(), captures[1].trim().to_string());
            }
        }

        // Extract birth date
        if let Ok(date_regex) = Regex::new(r"(?i)fecha\s+nac[:\s]+(\d{2}/\d{2}/\d{4})") {
            if let Some(captures) = date_regex.captures(text) {
                data.insert("birth_date".to_string(), captures[1].to_string());
            }
        }

        // Extract nationality
        if let Ok(nationality_regex) = Regex::new(r"(?i)nacionalidad[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)")
        {
            if let Some(captures) = nationality_regex.captures(text) {
                data.insert("nationality".to_string(), captures[1].trim().to_string());
            }
        }
    }

    fn extract_nie_fields(&self, text: &str, data: &mut std::collections::HashMap<String, String>) {
        use regex::Regex;

        // Extract NIE number
        if let Ok(nie_regex) = Regex::new(r"([XYZ]\d{7}[A-Z])") {
            if let Some(captures) = nie_regex.captures(text) {
                data.insert("document_number".to_string(), captures[1].to_string());
            }
        }

        // Reuse DNI field extraction logic for common fields
        self.extract_dni_fields(text, data);
    }

    fn extract_passport_fields(
        &self,
        text: &str,
        data: &mut std::collections::HashMap<String, String>,
    ) {
        use regex::Regex;

        // Extract passport number
        if let Ok(passport_regex) = Regex::new(r"([A-Z]{3}\d{6})") {
            if let Some(captures) = passport_regex.captures(text) {
                data.insert("document_number".to_string(), captures[1].to_string());
            }
        }

        // Extract given names
        if let Ok(name_regex) = Regex::new(r"(?i)(?:given names?|nombre)[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)")
        {
            if let Some(captures) = name_regex.captures(text) {
                data.insert("name".to_string(), captures[1].trim().to_string());
            }
        }

        // Extract surname
        if let Ok(surname_regex) = Regex::new(r"(?i)(?:surname|apellidos?)[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)")
        {
            if let Some(captures) = surname_regex.captures(text) {
                data.insert("surname".to_string(), captures[1].trim().to_string());
            }
        }

        // Extract expiry date
        if let Ok(expiry_regex) =
            Regex::new(r"(?i)(?:date of expiry|fecha de caducidad)[:\s]+(\d{2}/\d{2}/\d{4})")
        {
            if let Some(captures) = expiry_regex.captures(text) {
                data.insert("expiry_date".to_string(), captures[1].to_string());
            }
        }
    }

    pub fn get_text_regions(&self, text: &str) -> Vec<String> {
        // Split text into logical regions for better processing
        text.lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| line.trim().to_string())
            .collect()
    }
}
