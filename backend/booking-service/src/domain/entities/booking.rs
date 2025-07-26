
se chrono::{DateTime, Utc};
use shared::{BedType, BookingDto, BookingStatus};
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

    pub fn confirm(&mut self) {
        self.status = BookingStatus::Confirmed;
        self.updated_at = Utc::now();
    }

    pub fn cancel(&mut self) {
        self.status = BookingStatus::Cancelled;
        self.updated_at = Utc::now();
    }

    pub fn check_in(&mut self) {
        self.status = BookingStatus::CheckedIn;
        self.updated_at = Utc::now();
    }

    pub fn check_out(&mut self) {
        self.status = BookingStatus::CheckedOut;
        self.updated_at = Utc::now();
    }

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

    pub fn duration_nights(&self) -> i64 {
        (self.check_out.date_naive() - self.check_in.date_naive()).num_days()
    }
}
