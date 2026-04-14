//! `ocr-service` library crate — exposes modules for integration tests
//! and potential future use as a shared crate.
//!
//! The binary entry point (`main.rs`) re-uses these modules.

pub mod binder;
pub mod models;
pub mod ocr;
pub mod parser;
pub mod preprocess;
