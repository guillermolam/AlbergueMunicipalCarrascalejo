use chrono::{DateTime, Utc};
use futures::future::try_join_all;
use shared::{DocumentType, ExtractedData};
use tokio::task;
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

    // Async method for comprehensive validation using tokio
    pub async fn validate_comprehensive(
        &self,
    ) -> Result<ValidationResult, Box<dyn std::error::Error + Send + Sync>> {
        let validation_tasks = match self.document_type {
            DocumentType::DNI => {
                let checksum_task = task::spawn({
                    let doc_num = self.document_number.clone();
                    async move { validate_dni_checksum_async(&doc_num).await }
                });

                let format_task = task::spawn({
                    let doc_num = self.document_number.clone();
                    async move { validate_dni_format_async(&doc_num).await }
                });

                let expiry_task = task::spawn(async {
                    tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
                    true // DNI doesn't typically expire
                });

                let (checksum_valid, format_valid, expiry_valid) =
                    tokio::try_join!(checksum_task, format_task, expiry_task)?;

                ValidationResult {
                    is_valid: checksum_valid && format_valid && expiry_valid,
                    checksum_valid: Some(checksum_valid),
                    format_valid: Some(format_valid),
                    expiry_valid: Some(expiry_valid),
                    confidence: 0.95,
                    errors: if checksum_valid && format_valid {
                        vec![]
                    } else {
                        vec!["DNI validation failed".to_string()]
                    },
                }
            }
            DocumentType::NIE => {
                let checksum_task = task::spawn({
                    let doc_num = self.document_number.clone();
                    async move { validate_nie_checksum_async(&doc_num).await }
                });

                let format_task = task::spawn({
                    let doc_num = self.document_number.clone();
                    async move { validate_nie_format_async(&doc_num).await }
                });

                let (checksum_valid, format_valid) = tokio::try_join!(checksum_task, format_task)?;

                ValidationResult {
                    is_valid: checksum_valid && format_valid,
                    checksum_valid: Some(checksum_valid),
                    format_valid: Some(format_valid),
                    expiry_valid: Some(!self.is_expired()),
                    confidence: 0.90,
                    errors: if checksum_valid && format_valid {
                        vec![]
                    } else {
                        vec!["NIE validation failed".to_string()]
                    },
                }
            }
            DocumentType::Passport => {
                let mrz_task = task::spawn(async {
                    tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
                    true // Simplified passport validation
                });

                let expiry_task = task::spawn({
                    let is_expired = self.is_expired();
                    async move { !is_expired }
                });

                let (mrz_valid, expiry_valid) = tokio::try_join!(mrz_task, expiry_task)?;

                ValidationResult {
                    is_valid: mrz_valid && expiry_valid,
                    checksum_valid: Some(mrz_valid),
                    format_valid: Some(true),
                    expiry_valid: Some(expiry_valid),
                    confidence: 0.88,
                    errors: vec![],
                }
            }
        };

        Ok(validation_tasks)
    }

    pub fn validate_checksum(&self) -> bool {
        match self.document_type {
            DocumentType::DNI => self.validate_dni_checksum(),
            DocumentType::NIE => self.validate_nie_checksum(),
            DocumentType::Passport => true, // Passport validation is different
        }
    }

    fn validate_dni_checksum(&self) -> bool {
        validate_dni_checksum_sync(&self.document_number)
    }

    fn validate_nie_checksum(&self) -> bool {
        validate_nie_checksum_sync(&self.document_number)
    }
}

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub checksum_valid: Option<bool>,
    pub format_valid: Option<bool>,
    pub expiry_valid: Option<bool>,
    pub confidence: f64,
    pub errors: Vec<String>,
}

// Stateless pure function for DNI checksum validation (sync)
fn validate_dni_checksum_sync(dni: &str) -> bool {
    if dni.len() != 9 {
        return false;
    }

    let number_part = &dni[..8];
    let letter_part = &dni[8..];

    if let Ok(number) = number_part.parse::<u32>() {
        let letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        let expected_letter = letters.chars().nth((number % 23) as usize);

        if let Some(expected) = expected_letter {
            return letter_part.chars().next() == Some(expected);
        }
    }

    false
}

// Async stateless function for DNI checksum validation
async fn validate_dni_checksum_async(dni: &str) -> bool {
    tokio::time::sleep(tokio::time::Duration::from_millis(5)).await;
    validate_dni_checksum_sync(dni)
}

// Async stateless function for DNI format validation
async fn validate_dni_format_async(dni: &str) -> bool {
    tokio::time::sleep(tokio::time::Duration::from_millis(3)).await;

    if dni.len() != 9 {
        return false;
    }

    let number_part = &dni[..8];
    let letter_part = &dni[8..];

    number_part.chars().all(|c| c.is_ascii_digit())
        && letter_part.chars().all(|c| c.is_ascii_alphabetic())
}

// Stateless pure function for NIE checksum validation (sync)
fn validate_nie_checksum_sync(nie: &str) -> bool {
    if nie.len() != 9 {
        return false;
    }

    // NIE format: X1234567L or Y1234567L
    let first_char = nie.chars().next().unwrap_or(' ');
    if first_char != 'X' && first_char != 'Y' {
        return false;
    }

    let number_part = &nie[1..8];
    let letter_part = &nie[8..];

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

// Async stateless function for NIE checksum validation
async fn validate_nie_checksum_async(nie: &str) -> bool {
    tokio::time::sleep(tokio::time::Duration::from_millis(8)).await;
    validate_nie_checksum_sync(nie)
}

// Async stateless function for NIE format validation
async fn validate_nie_format_async(nie: &str) -> bool {
    tokio::time::sleep(tokio::time::Duration::from_millis(4)).await;

    if nie.len() != 9 {
        return false;
    }

    let first_char = nie.chars().next().unwrap_or(' ');
    matches!(first_char, 'X' | 'Y' | 'Z')
}

// Async stateless function for concurrent document validations
pub async fn validate_multiple_documents(
    documents: Vec<Document>,
) -> Result<Vec<ValidationResult>, Box<dyn std::error::Error + Send + Sync>> {
    let validation_tasks: Vec<_> = documents
        .into_iter()
        .map(|doc| task::spawn(async move { doc.validate_comprehensive().await }))
        .collect();

    let results = try_join_all(validation_tasks).await?;
    Ok(results.into_iter().collect::<Result<Vec<_>, _>>()?)
}
