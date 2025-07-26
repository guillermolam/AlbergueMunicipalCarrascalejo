use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BookingDto {
    pub id: Uuid,
    pub guest_name: String,
    pub guest_email: String,
    pub check_in: DateTime<Utc>,
    pub check_out: DateTime<Utc>,
    pub bed_type: BedType,
    pub status: BookingStatus,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub enum BedType {
    DormA,
    DormB,
    Private,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum BookingStatus {
    Reserved,
    Confirmed,
    CheckedIn,
    CheckedOut,
    Cancelled,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ValidationRequest {
    pub document_type: DocumentType,
    pub front_image: String, // base64
    pub back_image: Option<String>, // base64
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum DocumentType {
    DNI,
    NIE,
    Passport,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ValidationResponse {
    pub is_valid: bool,
    pub extracted_data: ExtractedData,
    pub confidence_score: f32,
    pub errors: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ExtractedData {
    pub document_number: Option<String>,
    pub name: Option<String>,
    pub surname: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub nationality: Option<String>,
    pub expiry_date: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CountryInfo {
    pub code: String,
    pub name: String,
    pub flag: Option<String>,
    pub phone_prefix: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SecurityEvent {
    pub event_type: SecurityEventType,
    pub user_id: Option<Uuid>,
    pub ip_address: String,
    pub timestamp: DateTime<Utc>,
    pub details: serde_json::Value,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SecurityEventType {
    Login,
    Logout,
    FailedLogin,
    DocumentAccess,
    DataModification,
}