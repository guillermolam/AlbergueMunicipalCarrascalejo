use chrono::{DateTime, NaiveDate, Utc};
use regex::Regex;
use shared::dto::ExtractedData;
use shared::AlbergueResult;

pub struct MrzValidator;

impl MrzValidator {
    pub fn new() -> Self {
        Self
    }

    #[tracing::instrument(skip(self), fields(mrz_len = mrz_line.len()))]
    pub fn validate_mrz_checksum(&self, mrz_line: &str) -> AlbergueResult<bool> {
        if mrz_line.len() != 44 {
            return Ok(false);
        }

        // MRZ check digit algorithm
        let weights = [7, 3, 1];
        let mut sum = 0;

        for (i, ch) in mrz_line.chars().enumerate() {
            let value = match ch {
                '0'..='9' => ch.to_digit(10).unwrap() as usize,
                'A'..='Z' => (ch as u8 - b'A' + 10) as usize,
                '<' => 0,
                _ => return Ok(false),
            };

            sum += value * weights[i % 3];
        }

        Ok(sum % 10 == 0)
    }

    #[tracing::instrument(skip(self))]
    pub fn extract_mrz_data(&self, mrz_text: &str) -> AlbergueResult<ExtractedData> {
        let mut extracted = ExtractedData::default();

        // TD1 format (3 lines, 30 characters each) - ID cards
        let td1_regex = Regex::new(r"([A-Z0-9<]{30})\n([A-Z0-9<]{30})\n([A-Z0-9<]{30})").unwrap();

        // TD3 format (2 lines, 44 characters each) - Passports
        let td3_regex = Regex::new(r"([A-Z0-9<]{44})\n([A-Z0-9<]{44})").unwrap();

        if let Some(captures) = td3_regex.captures(mrz_text) {
            self.parse_td3_format(&captures[1], &captures[2], &mut extracted)?;
        } else if let Some(captures) = td1_regex.captures(mrz_text) {
            self.parse_td1_format(&captures[1], &captures[2], &captures[3], &mut extracted)?;
        }

        Ok(extracted)
    }

    fn parse_td3_format(
        &self,
        line1: &str,
        line2: &str,
        extracted: &mut ExtractedData,
    ) -> AlbergueResult<()> {
        // Line 1: P<COUNTRY<SURNAME<<GIVEN_NAMES<<<<<<<<<<<<<<<
        if line1.len() >= 44 {
            let country = &line1[2..5];
            let name_part = &line1[5..44];

            // Extract surname and given names
            let parts: Vec<&str> = name_part.split("<<").collect();
            if !parts.is_empty() {
                extracted.surname = Some(parts[0].replace('<', " ").trim().to_string());
                if parts.len() > 1 {
                    extracted.name = Some(parts[1].replace('<', " ").trim().to_string());
                }
            }

            extracted.nationality = Some(country.to_string());
        }

        // Line 2: PASSPORT_NO<COUNTRY<BIRTH_DATE<SEX<EXPIRY_DATE<PERSONAL_NO
        if line2.len() >= 44 {
            let passport_no = &line2[0..9].replace('<', "");
            extracted.document_number = Some(passport_no.to_string());

            // Parse birth date (YYMMDD)
            let birth_date = &line2[13..19];
            if let Ok(date) = self.parse_mrz_date(birth_date) {
                extracted.birth_date = Some(date);
            }

            // Parse expiry date (YYMMDD)
            let expiry_date = &line2[21..27];
            if let Ok(date) = self.parse_mrz_date(expiry_date) {
                extracted.expiry_date = Some(date);
            }
        }

        Ok(())
    }

    fn parse_td1_format(
        &self,
        line1: &str,
        line2: &str,
        line3: &str,
        extracted: &mut ExtractedData,
    ) -> AlbergueResult<()> {
        // Line 1: DOCUMENT_TYPE<COUNTRY<DOCUMENT_NUMBER
        if line1.len() >= 30 {
            let country = &line1[2..5];
            let doc_number = &line1[5..14].replace('<', "");

            extracted.nationality = Some(country.to_string());
            extracted.document_number = Some(doc_number.to_string());
        }

        // Line 2: BIRTH_DATE<SEX<EXPIRY_DATE<NATIONALITY<OPTIONAL
        if line2.len() >= 30 {
            let birth_date = &line2[0..6];
            if let Ok(date) = self.parse_mrz_date(birth_date) {
                extracted.birth_date = Some(date);
            }

            let expiry_date = &line2[8..14];
            if let Ok(date) = self.parse_mrz_date(expiry_date) {
                extracted.expiry_date = Some(date);
            }
        }

        // Line 3: SURNAME<<GIVEN_NAMES<<<<<<<<<<<<<<<
        if line3.len() >= 30 {
            let parts: Vec<&str> = line3.split("<<").collect();
            if !parts.is_empty() {
                extracted.surname = Some(parts[0].replace('<', " ").trim().to_string());
                if parts.len() > 1 {
                    extracted.name = Some(parts[1].replace('<', " ").trim().to_string());
                }
            }
        }

        Ok(())
    }

    fn parse_mrz_date(&self, date_str: &str) -> Result<DateTime<Utc>, &'static str> {
        if date_str.len() != 6 {
            return Err("Invalid date format");
        }

        let year_part: i32 = date_str[0..2].parse().map_err(|_| "Invalid year")?;
        let month: u32 = date_str[2..4].parse().map_err(|_| "Invalid month")?;
        let day: u32 = date_str[4..6].parse().map_err(|_| "Invalid day")?;

        // Handle 2-digit year (assume 20xx for years < 50, 19xx for years >= 50)
        let year = if year_part < 50 {
            2000 + year_part
        } else {
            1900 + year_part
        };

        if let Some(naive_date) = NaiveDate::from_ymd_opt(year, month, day) {
            Ok(DateTime::from_naive_utc_and_offset(
                naive_date.and_hms_opt(0, 0, 0).unwrap(),
                Utc,
            ))
        } else {
            Err("Invalid date")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn validator() -> MrzValidator {
        MrzValidator::new()
    }

    // --- validate_mrz_checksum tests ---

    #[test]
    fn test_mrz_checksum_wrong_length() {
        assert!(!validator().validate_mrz_checksum("SHORT").unwrap());
    }

    #[test]
    fn test_mrz_checksum_rejects_invalid_chars() {
        // 44 chars with a lowercase letter
        let line = "P<ESPGARCIa<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<";
        assert!(!validator().validate_mrz_checksum(line).unwrap());
    }

    #[test]
    fn test_mrz_checksum_all_fillers() {
        // 44 '<' chars: all values are 0, sum=0, 0%10=0 -> valid
        let line = "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<";
        assert!(validator().validate_mrz_checksum(line).unwrap());
    }

    // --- extract_mrz_data TD3 tests ---

    #[test]
    fn test_extract_td3_passport_data() {
        // Build two 44-char lines for TD3 format (each must be exactly 44 chars [A-Z0-9<])
        let line1 = "P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<<"; // 44 chars
        let line2 = "ABC123456<ESP9001011M3012315<<<<<<<<<<<<<<02"; // 44 chars
        let mrz = format!("{}\n{}", line1, line2);

        let data = validator().extract_mrz_data(&mrz).unwrap();
        assert_eq!(data.nationality, Some("ESP".to_string()));
        assert_eq!(data.surname, Some("GARCIA".to_string()));
        assert_eq!(data.name, Some("JUAN".to_string()));
        assert!(data.document_number.is_some());
    }

    // --- parse_mrz_date tests (via extract_mrz_data) ---

    #[test]
    fn test_extract_td3_birth_date_parsing() {
        let line1 = "P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<<"; // 44 chars
                                                                    // Position 13..19 should be birth date in YYMMDD (900101 = 1990-01-01)
        let line2 = "ABC123456<ESP9001011M3012315<<<<<<<<<<<<<<02"; // 44 chars
        let mrz = format!("{}\n{}", line1, line2);

        let data = validator().extract_mrz_data(&mrz).unwrap();
        assert!(data.birth_date.is_some());
        let bdate = data.birth_date.unwrap();
        assert_eq!(bdate.format("%Y").to_string(), "1990");
    }

    #[test]
    fn test_extract_td3_future_year() {
        let line1 = "P<ESPGARCIA<<JUAN<<<<<<<<<<<<<<<<<<<<<<<<<<<"; // 44 chars
                                                                    // birth = 250101 => 2025-01-01 (year < 50 => 2000+25)
        let line2 = "ABC123456<ESP2501011M3012315<<<<<<<<<<<<<<02"; // 44 chars
        let mrz = format!("{}\n{}", line1, line2);

        let data = validator().extract_mrz_data(&mrz).unwrap();
        assert!(data.birth_date.is_some());
        let bdate = data.birth_date.unwrap();
        assert_eq!(bdate.format("%Y").to_string(), "2025");
    }

    // --- extract_mrz_data with no match ---

    #[test]
    fn test_extract_mrz_no_match() {
        let data = validator().extract_mrz_data("random text").unwrap();
        assert!(data.document_number.is_none());
        assert!(data.name.is_none());
    }
}
