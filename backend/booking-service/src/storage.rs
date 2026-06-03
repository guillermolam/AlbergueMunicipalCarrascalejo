use serde::{Deserialize, Serialize};
use shared::constants::{
    Booking, DashboardStats, OccupancyStats, Pricing, Room, SAMPLE_BOOKINGS,
    SAMPLE_DASHBOARD_STATS, SAMPLE_PRICING, SAMPLE_ROOMS,
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
        SAMPLE_BOOKINGS.to_vec()
    }

    fn get_rooms(&self) -> Vec<Room> {
        SAMPLE_ROOMS.to_vec()
    }

    fn get_dashboard_stats(&self) -> DashboardStats {
        SAMPLE_DASHBOARD_STATS
    }

    fn get_pricing(&self) -> Pricing {
        SAMPLE_PRICING
    }
}
