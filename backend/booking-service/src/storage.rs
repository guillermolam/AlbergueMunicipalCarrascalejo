use crate::shared::constants::{
    sample_bookings, sample_dashboard_stats, sample_pricing, sample_rooms, Booking, DashboardStats,
    Pricing, Room,
};
use std::sync::{Mutex, OnceLock};

static STORAGE: OnceLock<Mutex<StorageSnapshot>> = OnceLock::new();

#[derive(Clone)]
pub struct StorageSnapshot {
    pub bookings: Vec<Booking>,
    pub rooms: Vec<Room>,
    pub dashboard_stats: DashboardStats,
    pub pricing: Pricing,
}

pub trait StoragePort {
    fn snapshot(&self) -> StorageSnapshot;
    fn create_booking(&self, booking: Booking) -> Booking;
}

pub struct InMemoryStorage;

impl InMemoryStorage {
    fn storage() -> &'static Mutex<StorageSnapshot> {
        STORAGE.get_or_init(|| {
            Mutex::new(StorageSnapshot {
                bookings: sample_bookings().to_vec(),
                rooms: sample_rooms().to_vec(),
                dashboard_stats: sample_dashboard_stats(),
                pricing: sample_pricing(),
            })
        })
    }
}

impl StoragePort for InMemoryStorage {
    fn snapshot(&self) -> StorageSnapshot {
        self.storage()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone()
    }

    fn create_booking(&self, booking: Booking) -> Booking {
        self.storage()
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .bookings
            .push(booking.clone());
        booking
    }
}
