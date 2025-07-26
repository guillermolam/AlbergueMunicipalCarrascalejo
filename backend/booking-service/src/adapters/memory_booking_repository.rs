use crate::domain::entities::booking::Booking;
use crate::ports::booking_repository::BookingRepository;
use chrono::{DateTime, Utc};
use shared::{AlbergueResult, BedType};
use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;
use uuid::Uuid;

pub struct MemoryBookingRepository {
    bookings: Arc<Mutex<HashMap<Uuid, Booking>>>,
}

impl MemoryBookingRepository {
    pub fn new() -> Self {
        Self {
            bookings: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[async_trait::async_trait(?Send)]
impl BookingRepository for MemoryBookingRepository {
    async fn save(&self, booking: Booking) -> AlbergueResult<Booking> {
        let mut bookings = self.bookings.lock().unwrap();
        bookings.insert(booking.id, booking.clone());
        Ok(booking)
    }

    async fn find_by_id(&self, id: Uuid) -> AlbergueResult<Option<Booking>> {
        let bookings = self.bookings.lock().unwrap();
        Ok(bookings.get(&id).cloned())
    }

    async fn find_overlapping_bookings(
        &self,
        check_in: DateTime<Utc>,
        check_out: DateTime<Utc>,
        bed_type: &BedType,
    ) -> AlbergueResult<Vec<Booking>> {
        let bookings = self.bookings.lock().unwrap();
        let overlapping: Vec<Booking> = bookings
            .values()
            .filter(|booking| {
                booking.bed_type == *bed_type
                    && booking.check_in < check_out
                    && booking.check_out > check_in
            })
            .cloned()
            .collect();
        Ok(overlapping)
    }

    async fn update(&self, booking: Booking) -> AlbergueResult<Booking> {
        let mut bookings = self.bookings.lock().unwrap();
        bookings.insert(booking.id, booking.clone());
        Ok(booking)
    }

    async fn delete(&self, id: Uuid) -> AlbergueResult<()> {
        let mut bookings = self.bookings.lock().unwrap();
        bookings.remove(&id);
        Ok(())
    }
}
