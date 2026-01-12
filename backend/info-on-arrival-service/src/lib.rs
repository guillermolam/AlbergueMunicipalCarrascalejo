#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

pub mod adapters;
pub mod application;
pub mod domain;
pub mod infrastructure;
pub mod ports;

pub use application::info_service::InfoOnArrivalService;
pub use domain::info_card::{InfoCard, InfoCategory};
