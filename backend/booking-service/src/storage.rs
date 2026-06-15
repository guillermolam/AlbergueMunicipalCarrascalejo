use crate::shared::constants::{
    sample_bookings, sample_dashboard_stats, sample_pricing, sample_rooms, Booking, DashboardStats,
    Pricing, Room,
};
use std::sync::Mutex;

pub trait StoragePort {
    fn get_bookings(&self) -> Vec<Booking>;
    fn get_rooms(&self) -> Vec<Room>;
    fn get_dashboard_stats(&self) -> DashboardStats;
    fn get_pricing(&self) -> Pricing;
    #[must_use]
    fn create_booking(&self, booking: Booking) -> Booking;
}

pub struct InMemoryStorage {
    bookings: Mutex<Vec<Booking>>,
}

impl InMemoryStorage {
    #[must_use]
    pub fn new() -> Self {
        Self {
            bookings: Mutex::new(sample_bookings().to_vec()),
        }
    }
}

impl Default for InMemoryStorage {
    fn default() -> Self {
        Self::new()
    }
}

impl StoragePort for InMemoryStorage {
    fn get_bookings(&self) -> Vec<Booking> {
        match self.bookings.lock() {
            Ok(bookings) => bookings.clone(),
            Err(_) => sample_bookings().to_vec(),
        }
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

    #[must_use]
    fn create_booking(&self, booking: Booking) -> Booking {
        match self.bookings.lock() {
            Ok(mut bookings) => {
                bookings.push(booking.clone());
                booking
            }
            Err(_) => booking,
        }
    }
}
