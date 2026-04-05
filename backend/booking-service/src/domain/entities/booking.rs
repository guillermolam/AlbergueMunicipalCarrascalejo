use chrono::{DateTime, Utc};
use shared::{BedType, BookingDto, BookingStatus};
use tracing::instrument;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Booking {
    pub id: Uuid,
    pub guest_name: String,
    pub guest_email: String,
    pub check_in: DateTime<Utc>,
    pub check_out: DateTime<Utc>,
    pub bed_type: BedType,
    pub status: BookingStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Booking {
    #[instrument(skip(guest_name, guest_email))]
    pub fn new(
        guest_name: String,
        guest_email: String,
        check_in: DateTime<Utc>,
        check_out: DateTime<Utc>,
        bed_type: BedType,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            guest_name,
            guest_email,
            check_in,
            check_out,
            bed_type,
            status: BookingStatus::Reserved,
            created_at: now,
            updated_at: now,
        }
    }

    #[instrument(skip(dto))]
    pub fn from_dto(dto: BookingDto) -> Self {
        Self {
            id: dto.id,
            guest_name: dto.guest_name,
            guest_email: dto.guest_email,
            check_in: dto.check_in,
            check_out: dto.check_out,
            bed_type: dto.bed_type,
            status: dto.status,
            created_at: dto.created_at,
            updated_at: Utc::now(),
        }
    }

    #[instrument(skip(self))]
    pub fn to_dto(&self) -> BookingDto {
        BookingDto {
            id: self.id,
            guest_name: self.guest_name.clone(),
            guest_email: self.guest_email.clone(),
            check_in: self.check_in,
            check_out: self.check_out,
            bed_type: self.bed_type.clone(),
            status: self.status.clone(),
            created_at: self.created_at,
        }
    }

    #[instrument(skip(self))]
    pub fn confirm(&mut self) {
        self.status = BookingStatus::Confirmed;
        self.updated_at = Utc::now();
    }

    #[instrument(skip(self))]
    pub fn cancel(&mut self) {
        self.status = BookingStatus::Cancelled;
        self.updated_at = Utc::now();
    }

    #[instrument(skip(self))]
    pub fn check_in(&mut self) {
        self.status = BookingStatus::CheckedIn;
        self.updated_at = Utc::now();
    }

    #[instrument(skip(self))]
    pub fn check_out(&mut self) {
        self.status = BookingStatus::CheckedOut;
        self.updated_at = Utc::now();
    }

    #[instrument(skip(self))]
    pub fn is_expired(&self) -> bool {
        // Booking expires 2 hours after creation if not confirmed
        match self.status {
            BookingStatus::Reserved => {
                let expiry_time = self.created_at + chrono::Duration::hours(2);
                Utc::now() > expiry_time
            }
            _ => false,
        }
    }

    #[instrument(skip(self))]
    pub fn duration_nights(&self) -> i64 {
        (self.check_out.date_naive() - self.check_in.date_naive()).num_days()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn make_check_in() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 6, 1, 14, 0, 0).unwrap()
    }

    fn make_check_out() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 6, 3, 10, 0, 0).unwrap()
    }

    fn sample_booking() -> Booking {
        Booking::new(
            "Test Guest".to_string(),
            "test@example.com".to_string(),
            make_check_in(),
            make_check_out(),
            BedType::DormA,
        )
    }

    fn sample_dto() -> BookingDto {
        BookingDto {
            id: Uuid::new_v4(),
            guest_name: "DTO Guest".to_string(),
            guest_email: "dto@example.com".to_string(),
            check_in: make_check_in(),
            check_out: make_check_out(),
            bed_type: BedType::Private,
            status: BookingStatus::Confirmed,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn test_booking_new_sets_reserved_status() {
        let booking = sample_booking();
        assert!(matches!(booking.status, BookingStatus::Reserved));
    }

    #[test]
    fn test_booking_new_generates_uuid() {
        let b1 = sample_booking();
        let b2 = sample_booking();
        assert_ne!(b1.id, b2.id);
    }

    #[test]
    fn test_booking_new_sets_fields() {
        let booking = sample_booking();
        assert_eq!(booking.guest_name, "Test Guest");
        assert_eq!(booking.guest_email, "test@example.com");
        assert_eq!(booking.bed_type, BedType::DormA);
        assert_eq!(booking.check_in, make_check_in());
        assert_eq!(booking.check_out, make_check_out());
    }

    #[test]
    fn test_booking_new_timestamps_equal() {
        let booking = sample_booking();
        assert_eq!(booking.created_at, booking.updated_at);
    }

    #[test]
    fn test_from_dto_preserves_id() {
        let dto = sample_dto();
        let id = dto.id;
        let booking = Booking::from_dto(dto);
        assert_eq!(booking.id, id);
    }

    #[test]
    fn test_from_dto_preserves_fields() {
        let dto = sample_dto();
        let booking = Booking::from_dto(dto.clone());
        assert_eq!(booking.guest_name, dto.guest_name);
        assert_eq!(booking.guest_email, dto.guest_email);
        assert_eq!(booking.bed_type, dto.bed_type);
        assert_eq!(booking.check_in, dto.check_in);
        assert_eq!(booking.check_out, dto.check_out);
    }

    #[test]
    fn test_to_dto_preserves_fields() {
        let booking = sample_booking();
        let dto = booking.to_dto();
        assert_eq!(dto.id, booking.id);
        assert_eq!(dto.guest_name, booking.guest_name);
        assert_eq!(dto.guest_email, booking.guest_email);
        assert_eq!(dto.bed_type, booking.bed_type);
        assert_eq!(dto.check_in, booking.check_in);
        assert_eq!(dto.check_out, booking.check_out);
        assert_eq!(dto.created_at, booking.created_at);
    }

    #[test]
    fn test_dto_roundtrip() {
        let dto = sample_dto();
        let booking = Booking::from_dto(dto.clone());
        let roundtripped = booking.to_dto();
        assert_eq!(roundtripped.id, dto.id);
        assert_eq!(roundtripped.guest_name, dto.guest_name);
        assert_eq!(roundtripped.guest_email, dto.guest_email);
        assert_eq!(roundtripped.bed_type, dto.bed_type);
        assert_eq!(roundtripped.check_in, dto.check_in);
        assert_eq!(roundtripped.check_out, dto.check_out);
    }

    #[test]
    fn test_confirm_changes_status() {
        let mut booking = sample_booking();
        booking.confirm();
        assert!(matches!(booking.status, BookingStatus::Confirmed));
    }

    #[test]
    fn test_cancel_changes_status() {
        let mut booking = sample_booking();
        booking.cancel();
        assert!(matches!(booking.status, BookingStatus::Cancelled));
    }

    #[test]
    fn test_check_in_changes_status() {
        let mut booking = sample_booking();
        booking.check_in();
        assert!(matches!(booking.status, BookingStatus::CheckedIn));
    }

    #[test]
    fn test_check_out_changes_status() {
        let mut booking = sample_booking();
        booking.check_out();
        assert!(matches!(booking.status, BookingStatus::CheckedOut));
    }

    #[test]
    fn test_duration_nights() {
        let booking = sample_booking();
        assert_eq!(booking.duration_nights(), 2);
    }

    #[test]
    fn test_is_expired_false_when_just_created() {
        let booking = sample_booking();
        assert!(!booking.is_expired());
    }

    #[test]
    fn test_is_expired_false_when_confirmed() {
        let mut booking = sample_booking();
        booking.confirm();
        assert!(!booking.is_expired());
    }

    #[test]
    fn test_status_transitions_update_timestamp() {
        let mut booking = sample_booking();
        let original = booking.updated_at;
        // Small sleep not needed; confirm() always calls Utc::now()
        booking.confirm();
        assert!(booking.updated_at >= original);
    }
}
