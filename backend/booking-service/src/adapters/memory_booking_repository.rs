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

impl Default for MemoryBookingRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl MemoryBookingRepository {
    #[must_use]
    pub fn new() -> Self {
        Self {
            bookings: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[async_trait::async_trait(?Send)]
impl BookingRepository for MemoryBookingRepository {
    async fn save(&self, booking: Booking) -> AlbergueResult<Booking> {
        self.bookings
            .lock()
            .unwrap()
            .insert(booking.id, booking.clone());
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
        let overlapping: Vec<Booking> = self
            .bookings
            .lock()
            .unwrap()
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
        self.bookings
            .lock()
            .unwrap()
            .insert(booking.id, booking.clone());
        Ok(booking)
    }

    async fn delete(&self, id: Uuid) -> AlbergueResult<()> {
        self.bookings.lock().unwrap().remove(&id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::booking::Booking;
    use chrono::TimeZone;
    use shared::BookingStatus;

    fn make_booking(bed_type: BedType) -> Booking {
        let check_in = Utc.with_ymd_and_hms(2026, 7, 1, 14, 0, 0).unwrap();
        let check_out = Utc.with_ymd_and_hms(2026, 7, 3, 10, 0, 0).unwrap();
        Booking::new(
            "Repo Test".to_string(),
            "repo@test.com".to_string(),
            check_in,
            check_out,
            bed_type,
        )
    }

    #[tokio::test]
    async fn test_save_and_find_by_id() {
        let repo = MemoryBookingRepository::new();
        let booking = make_booking(BedType::DormA);
        let id = booking.id;
        repo.save(booking).await.unwrap();
        let found = repo.find_by_id(id).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id, id);
    }

    #[tokio::test]
    async fn test_find_by_id_not_found() {
        let repo = MemoryBookingRepository::new();
        let result = repo.find_by_id(Uuid::new_v4()).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_update_booking() {
        let repo = MemoryBookingRepository::new();
        let mut booking = make_booking(BedType::DormB);
        let id = booking.id;
        repo.save(booking.clone()).await.unwrap();

        booking.confirm();
        repo.update(booking).await.unwrap();

        let found = repo.find_by_id(id).await.unwrap().unwrap();
        assert!(matches!(found.status, BookingStatus::Confirmed));
    }

    #[tokio::test]
    async fn test_delete_booking() {
        let repo = MemoryBookingRepository::new();
        let booking = make_booking(BedType::Private);
        let id = booking.id;
        repo.save(booking).await.unwrap();
        repo.delete(id).await.unwrap();
        let found = repo.find_by_id(id).await.unwrap();
        assert!(found.is_none());
    }

    #[tokio::test]
    async fn test_find_overlapping_bookings() {
        let repo = MemoryBookingRepository::new();
        let booking = make_booking(BedType::DormA);
        repo.save(booking).await.unwrap();

        let ci = Utc.with_ymd_and_hms(2026, 7, 2, 0, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2026, 7, 4, 0, 0, 0).unwrap();
        let overlapping = repo
            .find_overlapping_bookings(ci, co, &BedType::DormA)
            .await
            .unwrap();
        assert_eq!(overlapping.len(), 1);
    }

    #[tokio::test]
    async fn test_find_overlapping_bookings_no_overlap() {
        let repo = MemoryBookingRepository::new();
        let booking = make_booking(BedType::DormA);
        repo.save(booking).await.unwrap();

        let ci = Utc.with_ymd_and_hms(2026, 8, 1, 0, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2026, 8, 3, 0, 0, 0).unwrap();
        let overlapping = repo
            .find_overlapping_bookings(ci, co, &BedType::DormA)
            .await
            .unwrap();
        assert!(overlapping.is_empty());
    }

    #[tokio::test]
    async fn test_find_overlapping_bookings_different_bed_type() {
        let repo = MemoryBookingRepository::new();
        let booking = make_booking(BedType::DormA);
        repo.save(booking).await.unwrap();

        let ci = Utc.with_ymd_and_hms(2026, 7, 1, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2026, 7, 3, 10, 0, 0).unwrap();
        let overlapping = repo
            .find_overlapping_bookings(ci, co, &BedType::Private)
            .await
            .unwrap();
        assert!(overlapping.is_empty());
    }
}
