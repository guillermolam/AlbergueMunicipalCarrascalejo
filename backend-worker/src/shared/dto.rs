use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum DocumentType {
    DNI,
    NIE,
    Passport,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValidationRequest {
    pub document_type: DocumentType,
    pub document_number: String,
    pub image_data: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ExtractedData {
    pub document_number: Option<String>,
    pub full_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub nationality: Option<String>,
}
