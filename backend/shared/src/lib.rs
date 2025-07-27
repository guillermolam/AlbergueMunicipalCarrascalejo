// Shared types and utilities for WASM microservices
// Types are now generated from database/ folder schema definitions

pub mod db;
pub mod dto;
pub mod error;

use serde::{Deserialize, Serialize};
use std::sync::Once;
use tokio::runtime::Runtime;
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

static INIT: Once = Once::new();
static mut RUNTIME: Option<Runtime> = None;

// Utility function to get or create Tokio runtime for WASM compatibility
pub fn get_or_create_runtime() -> &'static Runtime {
    unsafe {
        INIT.call_once(|| {
            RUNTIME = Some(Runtime::new().expect("Failed to create Tokio runtime"));
        });
        RUNTIME.as_ref().unwrap()
    }
}

// Async utility functions
pub mod async_utils {
    use futures::future::try_join_all;
    use std::future::Future;
    use tokio::time::{sleep, Duration};

    // Stateless function to execute tasks with timeout
    pub async fn with_timeout<T, F>(
        future: F,
        timeout_ms: u64,
    ) -> Result<T, Box<dyn std::error::Error + Send + Sync>>
    where
        F: Future<Output = Result<T, Box<dyn std::error::Error + Send + Sync>>>,
    {
        tokio::time::timeout(Duration::from_millis(timeout_ms), future)
            .await
            .map_err(|_| "Operation timed out".into())?
    }

    // Stateless function to retry operations
    pub async fn retry_with_backoff<T, F, Fut>(
        mut operation: F,
        max_retries: usize,
        base_delay_ms: u64,
    ) -> Result<T, Box<dyn std::error::Error + Send + Sync>>
    where
        F: FnMut() -> Fut,
        Fut: Future<Output = Result<T, Box<dyn std::error::Error + Send + Sync>>>,
    {
        let mut attempts = 0;

        loop {
            match operation().await {
                Ok(result) => return Ok(result),
                Err(e) if attempts >= max_retries => return Err(e),
                Err(_) => {
                    attempts += 1;
                    let delay = base_delay_ms * 2_u64.pow(attempts as u32 - 1);
                    sleep(Duration::from_millis(delay)).await;
                }
            }
        }
    }

    // Stateless function to execute tasks concurrently with limit
    pub async fn execute_concurrent<T, F, Fut>(
        tasks: Vec<F>,
        concurrency_limit: usize,
    ) -> Vec<Result<T, Box<dyn std::error::Error + Send + Sync>>>
    where
        F: FnOnce() -> Fut,
        Fut: Future<Output = Result<T, Box<dyn std::error::Error + Send + Sync>>>,
        T: Send + 'static,
    {
        use std::sync::Arc;
        use tokio::sync::Semaphore;

        let semaphore = Arc::new(Semaphore::new(concurrency_limit));
        let handles: Vec<_> = tasks
            .into_iter()
            .map(|task| {
                let semaphore = Arc::clone(&semaphore);
                tokio::spawn(async move {
                    let _permit = semaphore.acquire().await.unwrap();
                    task().await
                })
            })
            .collect();

        let mut results = Vec::new();
        for handle in handles {
            results.push(handle.await.unwrap_or_else(|e| Err(e.into())));
        }

        results
    }
}

// Re-export common async traits and types
pub use async_utils::*;
pub use futures::future::{join_all, try_join_all};
pub use tokio::task;
