use crate::shared::constants::{
    sample_bookings, sample_dashboard_stats, sample_pricing, sample_rooms, Booking, DashboardStats,
    Pricing, Room,
};

/// Storage port abstracting over different storage backends (Spin KV, Cloudflare KV, etc.)
pub trait StoragePort {
    fn get_bookings(&self) -> Vec<Booking>;
    fn get_rooms(&self) -> Vec<Room>;
    fn get_dashboard_stats(&self) -> DashboardStats;
    fn get_pricing(&self) -> Pricing;
    // Note: create_booking would typically mutate state, but for simplicity we omit it here.
    // In a real implementation, we would have a method to add a booking.
}

/// In-memory storage implementation using hardcoded data.
pub struct InMemoryStorage;

impl StoragePort for InMemoryStorage {
    fn get_bookings(&self) -> Vec<Booking> {
        sample_bookings().to_vec()
    }

    fn get_rooms(&self) -> Vec<Room> {
        sample_rooms().to_vec()
    }

    fn get_dashboard_stats(&self) -> DashboardStats {
        sample_dashboard_stats()
    }

    fn get_pricing(&self) -> Pricing {
        sample_pricing()
    }
}
