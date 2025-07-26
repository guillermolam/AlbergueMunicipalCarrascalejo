// Shared types and utilities for WASM microservices
// Types are now generated from database/ folder schema definitions

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Re-export common types for microservices
pub use serde_json::{json, Value as JsonValue};

// Common error types for all services
#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct ServiceError {
    pub message: String,
    pub code: u16,
    pub details: Option<String>,
}

#[wasm_bindgen]
impl ServiceError {
    #[wasm_bindgen(constructor)]
    pub fn new(message: String, code: u16) -> ServiceError {
        ServiceError {
            message,
            code,
            details: None,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn message(&self) -> String {
        self.message.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn code(&self) -> u16 {
        self.code
    }
}

// Common response wrapper for all API calls
#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ServiceError>,
}

// Room availability DTO for frontend consumption
#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct RoomAvailability {
    pub room_id: String,
    pub room_name: String,
    pub room_type: String,
    pub total_beds: u32,
    pub available_beds: u32,
    pub price_per_night: f64,
    pub currency: String,
    pub amenities: Vec<String>,
}

#[wasm_bindgen]
impl RoomAvailability {
    #[wasm_bindgen(constructor)]
    pub fn new(
        room_id: String,
        room_name: String,
        room_type: String,
        total_beds: u32,
        available_beds: u32,
        price_per_night: f64,
    ) -> RoomAvailability {
        RoomAvailability {
            room_id,
            room_name,
            room_type,
            total_beds,
            available_beds,
            price_per_night,
            currency: "EUR".to_string(),
            amenities: vec![],
        }
    }

    #[wasm_bindgen(getter)]
    pub fn room_id(&self) -> String {
        self.room_id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn room_name(&self) -> String {
        self.room_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn available_beds(&self) -> u32 {
        self.available_beds
    }

    #[wasm_bindgen(getter)]
    pub fn price_per_night(&self) -> f64 {
        self.price_per_night
    }
}

// Booking request DTO
#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct BookingRequest {
    pub pilgrim_name: String,
    pub pilgrim_email: String,
    pub pilgrim_phone: String,
    pub room_type: String,
    pub check_in_date: String,
    pub check_out_date: String,
    pub number_of_nights: u32,
}

#[wasm_bindgen]
impl BookingRequest {
    #[wasm_bindgen(constructor)]
    pub fn new(
        pilgrim_name: String,
        pilgrim_email: String,
        pilgrim_phone: String,
        room_type: String,
        check_in_date: String,
        check_out_date: String,
        number_of_nights: u32,
    ) -> BookingRequest {
        BookingRequest {
            pilgrim_name,
            pilgrim_email,
            pilgrim_phone,
            room_type,
            check_in_date,
            check_out_date,
            number_of_nights,
        }
    }
}

// Validation result for document processing
#[derive(Debug, Serialize, Deserialize, Clone)]
#[wasm_bindgen]
pub struct ValidationResult {
    pub valid: bool,
    pub confidence: f64,
    pub extracted_data: JsonValue,
    pub errors: Vec<String>,
}

#[wasm_bindgen]
impl ValidationResult {
    #[wasm_bindgen(constructor)]
    pub fn new(valid: bool, confidence: f64) -> ValidationResult {
        ValidationResult {
            valid,
            confidence,
            extracted_data: json!({}), 
            errors: vec![],
        }
    }

    #[wasm_bindgen(getter)]
    pub fn valid(&self) -> bool {
        self.valid
    }

    #[wasm_bindgen(getter)]
    pub fn confidence(&self) -> f64 {
        self.confidence
    }
}

// Utility functions for all services
pub fn generate_reference_number() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("ALB{}", timestamp)
}

pub fn calculate_price(nights: u32, price_per_night: f64) -> f64 {
    nights as f64 * price_per_night
}