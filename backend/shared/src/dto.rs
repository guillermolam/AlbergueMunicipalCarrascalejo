use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
    pub front_image: String,        // base64
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn sample_booking_dto() -> BookingDto {
        BookingDto {
            id: Uuid::nil(),
            guest_name: "Juan Garcia".to_string(),
            guest_email: "juan@example.com".to_string(),
            check_in: Utc.with_ymd_and_hms(2025, 6, 15, 14, 0, 0).unwrap(),
            check_out: Utc.with_ymd_and_hms(2025, 6, 17, 10, 0, 0).unwrap(),
            bed_type: BedType::DormA,
            status: BookingStatus::Reserved,
            created_at: Utc.with_ymd_and_hms(2025, 6, 1, 12, 0, 0).unwrap(),
        }
    }

    // --- BookingDto ---

    #[test]
    fn test_booking_dto_serialize_deserialize() {
        let booking = sample_booking_dto();
        let json = serde_json::to_string(&booking).unwrap();
        let deserialized: BookingDto = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, booking.id);
        assert_eq!(deserialized.guest_name, "Juan Garcia");
        assert_eq!(deserialized.guest_email, "juan@example.com");
    }

    #[test]
    fn test_booking_dto_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000000",
            "guest_name": "Maria",
            "guest_email": "maria@test.com",
            "check_in": "2025-06-15T14:00:00Z",
            "check_out": "2025-06-17T10:00:00Z",
            "bed_type": "Private",
            "status": "Confirmed",
            "created_at": "2025-06-01T12:00:00Z"
        }"#;
        let booking: BookingDto = serde_json::from_str(json).unwrap();
        assert_eq!(booking.guest_name, "Maria");
        assert_eq!(booking.bed_type, BedType::Private);
    }

    #[test]
    fn test_booking_dto_clone() {
        let booking = sample_booking_dto();
        let cloned = booking.clone();
        assert_eq!(cloned.id, booking.id);
        assert_eq!(cloned.guest_name, booking.guest_name);
    }

    // --- BedType ---

    #[test]
    fn test_bed_type_all_variants_roundtrip() {
        for variant in [BedType::DormA, BedType::DormB, BedType::Private] {
            let json = serde_json::to_string(&variant).unwrap();
            let back: BedType = serde_json::from_str(&json).unwrap();
            assert_eq!(back, variant);
        }
    }

    #[test]
    fn test_bed_type_json_values() {
        assert_eq!(
            serde_json::to_string(&BedType::DormA).unwrap(),
            r#""DormA""#
        );
        assert_eq!(
            serde_json::to_string(&BedType::DormB).unwrap(),
            r#""DormB""#
        );
        assert_eq!(
            serde_json::to_string(&BedType::Private).unwrap(),
            r#""Private""#
        );
    }

    #[test]
    fn test_bed_type_invalid_json() {
        let result: Result<BedType, _> = serde_json::from_str(r#""InvalidBed""#);
        assert!(result.is_err());
    }

    // --- BookingStatus ---

    #[test]
    fn test_booking_status_all_variants_roundtrip() {
        let variants = vec![
            BookingStatus::Reserved,
            BookingStatus::Confirmed,
            BookingStatus::CheckedIn,
            BookingStatus::CheckedOut,
            BookingStatus::Cancelled,
        ];
        for variant in variants {
            let json = serde_json::to_string(&variant).unwrap();
            let _back: BookingStatus = serde_json::from_str(&json).unwrap();
        }
    }

    #[test]
    fn test_booking_status_invalid_json() {
        let result: Result<BookingStatus, _> = serde_json::from_str(r#""Unknown""#);
        assert!(result.is_err());
    }

    // --- DocumentType ---

    #[test]
    fn test_document_type_all_variants() {
        for variant in [DocumentType::DNI, DocumentType::NIE, DocumentType::Passport] {
            let json = serde_json::to_string(&variant).unwrap();
            let _back: DocumentType = serde_json::from_str(&json).unwrap();
        }
    }

    #[test]
    fn test_document_type_json_values() {
        assert_eq!(
            serde_json::to_string(&DocumentType::DNI).unwrap(),
            r#""DNI""#
        );
        assert_eq!(
            serde_json::to_string(&DocumentType::NIE).unwrap(),
            r#""NIE""#
        );
        assert_eq!(
            serde_json::to_string(&DocumentType::Passport).unwrap(),
            r#""Passport""#
        );
    }

    // --- ValidationRequest ---

    #[test]
    fn test_validation_request_with_back_image() {
        let req = ValidationRequest {
            document_type: DocumentType::DNI,
            front_image: "base64front".to_string(),
            back_image: Some("base64back".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ValidationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.front_image, "base64front");
        assert_eq!(back.back_image, Some("base64back".to_string()));
    }

    #[test]
    fn test_validation_request_without_back_image() {
        let req = ValidationRequest {
            document_type: DocumentType::Passport,
            front_image: "base64front".to_string(),
            back_image: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: ValidationRequest = serde_json::from_str(&json).unwrap();
        assert!(back.back_image.is_none());
    }

    // --- ValidationResponse ---

    #[test]
    fn test_validation_response_valid() {
        let resp = ValidationResponse {
            is_valid: true,
            extracted_data: ExtractedData::default(),
            confidence_score: 0.95,
            errors: vec![],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ValidationResponse = serde_json::from_str(&json).unwrap();
        assert!(back.is_valid);
        assert!(back.errors.is_empty());
        assert!((back.confidence_score - 0.95).abs() < f32::EPSILON);
    }

    #[test]
    fn test_validation_response_with_errors() {
        let resp = ValidationResponse {
            is_valid: false,
            extracted_data: ExtractedData::default(),
            confidence_score: 0.3,
            errors: vec!["Document expired".to_string(), "Image blurry".to_string()],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let back: ValidationResponse = serde_json::from_str(&json).unwrap();
        assert!(!back.is_valid);
        assert_eq!(back.errors.len(), 2);
    }

    // --- ExtractedData ---

    #[test]
    fn test_extracted_data_default() {
        let data = ExtractedData::default();
        assert!(data.document_number.is_none());
        assert!(data.name.is_none());
        assert!(data.surname.is_none());
        assert!(data.birth_date.is_none());
        assert!(data.nationality.is_none());
        assert!(data.expiry_date.is_none());
    }

    #[test]
    fn test_extracted_data_full() {
        let data = ExtractedData {
            document_number: Some("12345678A".to_string()),
            name: Some("Juan".to_string()),
            surname: Some("Garcia".to_string()),
            birth_date: Some(Utc.with_ymd_and_hms(1990, 1, 15, 0, 0, 0).unwrap()),
            nationality: Some("ES".to_string()),
            expiry_date: Some(Utc.with_ymd_and_hms(2030, 1, 15, 0, 0, 0).unwrap()),
        };
        let json = serde_json::to_string(&data).unwrap();
        let back: ExtractedData = serde_json::from_str(&json).unwrap();
        assert_eq!(back.document_number, Some("12345678A".to_string()));
        assert_eq!(back.name, Some("Juan".to_string()));
    }

    // --- CountryInfo ---

    #[test]
    fn test_country_info_full() {
        let info = CountryInfo {
            code: "ES".to_string(),
            name: "Spain".to_string(),
            flag: Some("🇪🇸".to_string()),
            phone_prefix: Some("+34".to_string()),
        };
        let json = serde_json::to_string(&info).unwrap();
        let back: CountryInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "ES");
        assert_eq!(back.name, "Spain");
        assert_eq!(back.phone_prefix, Some("+34".to_string()));
    }

    #[test]
    fn test_country_info_minimal() {
        let info = CountryInfo {
            code: "XX".to_string(),
            name: "Unknown".to_string(),
            flag: None,
            phone_prefix: None,
        };
        let json = serde_json::to_string(&info).unwrap();
        let back: CountryInfo = serde_json::from_str(&json).unwrap();
        assert!(back.flag.is_none());
        assert!(back.phone_prefix.is_none());
    }

    // --- SecurityEvent ---

    #[test]
    fn test_security_event_serialize() {
        let event = SecurityEvent {
            event_type: SecurityEventType::Login,
            user_id: Some(Uuid::nil()),
            ip_address: "192.168.1.1".to_string(),
            timestamp: Utc::now(),
            details: serde_json::json!({"action": "login"}),
        };
        let json = serde_json::to_string(&event).unwrap();
        let back: SecurityEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(back.ip_address, "192.168.1.1");
    }

    #[test]
    fn test_security_event_no_user_id() {
        let event = SecurityEvent {
            event_type: SecurityEventType::FailedLogin,
            user_id: None,
            ip_address: "10.0.0.1".to_string(),
            timestamp: Utc::now(),
            details: serde_json::json!({}),
        };
        let json = serde_json::to_string(&event).unwrap();
        let back: SecurityEvent = serde_json::from_str(&json).unwrap();
        assert!(back.user_id.is_none());
    }

    // --- SecurityEventType ---

    #[test]
    fn test_security_event_type_all_variants() {
        let variants = vec![
            SecurityEventType::Login,
            SecurityEventType::Logout,
            SecurityEventType::FailedLogin,
            SecurityEventType::DocumentAccess,
            SecurityEventType::DataModification,
        ];
        for variant in variants {
            let json = serde_json::to_string(&variant).unwrap();
            let _back: SecurityEventType = serde_json::from_str(&json).unwrap();
        }
    }

    #[test]
    fn test_security_event_type_invalid() {
        let result: Result<SecurityEventType, _> = serde_json::from_str(r#""Hacking""#);
        assert!(result.is_err());
    }
}
