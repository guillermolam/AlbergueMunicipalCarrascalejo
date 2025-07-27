use chrono::{DateTime, NaiveDate, Utc};
use regex::Regex;
use shared::{AlbergueResult, ExtractedData};

pub struct PassportValidator;

impl PassportValidator {
    pub fn new() -> Self {
        Self
    }

    pub fn validate_passport(&self, passport_number: &str) -> AlbergueResult<bool> {
        // Spanish passport format: 3 letters + 6 digits
        let spanish_passport_regex = Regex::new(r"^[A-Z]{3}\d{6}$").unwrap();

        // International passport formats (basic validation)
        let international_passport_regex = Regex::new(r"^[A-Z0-9]{6,9}$").unwrap();

        Ok(spanish_passport_regex.is_match(passport_number)
            || international_passport_regex.is_match(passport_number))
    }

    pub fn extract_passport_data(&self, passport_text: &str) -> AlbergueResult<ExtractedData> {
        let mut extracted = ExtractedData::default();

        // Extract passport number (Spanish format)
        let passport_regex = Regex::new(r"([A-Z]{3}\d{6})").unwrap();
        if let Some(captures) = passport_regex.captures(passport_text) {
            extracted.document_number = Some(captures[1].to_string());
        }

        // Extract MRZ data if present (Machine Readable Zone)
        self.extract_mrz_data(passport_text, &mut extracted)?;

        // Extract standard passport fields
        let name_regex = Regex::new(r"(?i)(?:given names?|nombre)[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = name_regex.captures(passport_text) {
            extracted.name = Some(captures[1].trim().to_string());
        }

        let surname_regex =
            Regex::new(r"(?i)(?:surname|apellidos?)[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = surname_regex.captures(passport_text) {
            extracted.surname = Some(captures[1].trim().to_string());
        }

        // Extract birth date
        let date_regex = Regex::new(
            r"(?i)(?:date of birth|fecha de nacimiento)[:\s]+(\d{2})[/.-](\d{2})[/.-](\d{4})",
        )
        .unwrap();
        if let Some(captures) = date_regex.captures(passport_text) {
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

        // Extract nationality
        let nationality_regex =
            Regex::new(r"(?i)(?:nationality|nacionalidad)[:\s]+([A-ZÁÉÍÓÚÑÜ\s]+)").unwrap();
        if let Some(captures) = nationality_regex.captures(passport_text) {
            extracted.nationality = Some(captures[1].trim().to_string());
        }

        // Extract expiry date
        let expiry_regex = Regex::new(
            r"(?i)(?:date of expiry|fecha de caducidad)[:\s]+(\d{2})[/.-](\d{2})[/.-](\d{4})",
        )
        .unwrap();
        if let Some(captures) = expiry_regex.captures(passport_text) {
            let day: u32 = captures[1].parse().unwrap_or(1);
            let month: u32 = captures[2].parse().unwrap_or(1);
            let year: i32 = captures[3].parse().unwrap_or(1900);

            if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
                extracted.expiry_date = Some(DateTime::from_naive_utc_and_offset(
                    naive_date.and_hms_opt(23, 59, 59).unwrap(),
                    Utc,
                ));
            }
        }

        Ok(extracted)
    }

    fn extract_mrz_data(&self, text: &str, extracted: &mut ExtractedData) -> AlbergueResult<()> {
        // MRZ Line 1: P<COUNTRY<SURNAME<<GIVEN_NAMES<<<<<<<<<<<<<<<
        // MRZ Line 2: PASSPORT_NO<COUNTRY<BIRTH_DATE<SEX<EXPIRY_DATE<PERSONAL_NO

        let mrz_line1_regex = Regex::new(r"P<([A-Z]{3})<([A-Z<]+)").unwrap();
        let mrz_line2_regex =
            Regex::new(r"([A-Z0-9<]{9})<([A-Z]{3})<(\d{6})<([MF])<(\d{6})<").unwrap();

        if let Some(captures) = mrz_line1_regex.captures(text) {
            let nationality = captures[1].to_string();
            let name_part = captures[2].replace('<', " ").trim().to_string();

            // Split surname and given names (separated by <<)
            let parts: Vec<&str> = name_part.split("  ").collect();
            if parts.len() >= 2 {
                extracted.surname = Some(parts[0].trim().to_string());
                extracted.name = Some(parts[1].trim().to_string());
            }

            extracted.nationality = Some(nationality);
        }

        if let Some(captures) = mrz_line2_regex.captures(text) {
            let passport_no = captures[1].replace('<', "");
            extracted.document_number = Some(passport_no);

            // Parse birth date (YYMMDD format)
            let birth_str = &captures[3];
            if birth_str.len() == 6 {
                let year: i32 = format!("20{}", &birth_str[0..2]).parse().unwrap_or(2000);
                let month: u32 = birth_str[2..4].parse().unwrap_or(1);
                let day: u32 = birth_str[4..6].parse().unwrap_or(1);

                if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
                    extracted.birth_date = Some(DateTime::from_naive_utc_and_offset(
                        naive_date.and_hms_opt(0, 0, 0).unwrap(),
                        Utc,
                    ));
                }
            }

            // Parse expiry date (YYMMDD format)
            let expiry_str = &captures[5];
            if expiry_str.len() == 6 {
                let year: i32 = format!("20{}", &expiry_str[0..2]).parse().unwrap_or(2030);
                let month: u32 = expiry_str[2..4].parse().unwrap_or(1);
                let day: u32 = expiry_str[4..6].parse().unwrap_or(1);

                if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
                    extracted.expiry_date = Some(DateTime::from_naive_utc_and_offset(
                        naive_date.and_hms_opt(23, 59, 59).unwrap(),
                        Utc,
                    ));
                }
            }
        }

        Ok(())
    }
}
