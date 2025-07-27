use crate::domain::entities::booking::Booking;
use chrono::{DateTime, Utc};
use shared::{AlbergueResult, BedType};
use uuid::Uuid;

#[async_trait::async_trait(?Send)]
pub trait BookingRepository {
    async fn save(&self, booking: Booking) -> AlbergueResult<Booking>;
    async fn find_by_id(&self, id: Uuid) -> AlbergueResult<Option<Booking>>;
    async fn find_overlapping_bookings(
        &self,
        check_in: DateTime<Utc>,
        check_out: DateTime<Utc>,
        bed_type: &BedType,
    ) -> AlbergueResult<Vec<Booking>>;
    async fn update(&self, booking: Booking) -> AlbergueResult<Booking>;
    async fn delete(&self, id: Uuid) -> AlbergueResult<()>;
}
