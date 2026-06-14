use crate::shared::constants::{
    sample_bookings, sample_dashboard_stats, sample_pricing, sample_rooms, Booking, DashboardStats,
    Pricing, Room,
};

pub struct StorageSnapshot {
    pub bookings: Vec<Booking>,
    pub rooms: Vec<Room>,
    pub dashboard_stats: DashboardStats,
    pub pricing: Pricing,
}

pub trait StoragePort {
    fn snapshot(&self) -> StorageSnapshot;
}

pub struct InMemoryStorage;

impl StoragePort for InMemoryStorage {
    fn snapshot(&self) -> StorageSnapshot {
        StorageSnapshot {
            bookings: sample_bookings().to_vec(),
            rooms: sample_rooms().to_vec(),
            dashboard_stats: sample_dashboard_stats(),
            pricing: sample_pricing(),
        }
    }
}
