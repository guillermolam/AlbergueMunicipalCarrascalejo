#[cfg(target_arch = "wasm32")]
use crate::adapters::console_notification_sender::ConsoleNotificationSender;
use crate::adapters::memory_booking_repository::MemoryBookingRepository;
use crate::domain::entities::booking::Booking;
use crate::ports::booking_repository::BookingRepository;
#[cfg(target_arch = "wasm32")]
use crate::ports::notification_sender::NotificationSender;
use shared::{AlbergueError, AlbergueResult, BookingDto};
use tracing::instrument;

pub struct CreateBookingUseCase {
    booking_repository: MemoryBookingRepository,
    #[cfg(target_arch = "wasm32")]
    notification_sender: ConsoleNotificationSender,
}

impl Default for CreateBookingUseCase {
    fn default() -> Self {
        Self::new()
    }
}

impl CreateBookingUseCase {
    #[must_use]
    pub fn new() -> Self {
        Self {
            booking_repository: MemoryBookingRepository::new(),
            #[cfg(target_arch = "wasm32")]
            notification_sender: ConsoleNotificationSender::new(),
        }
    }

    #[instrument(skip(self, booking_dto))]
    pub async fn execute(&self, booking_dto: BookingDto) -> AlbergueResult<BookingDto> {
        // Create booking entity from DTO
        let booking = Booking::from_dto(booking_dto);

        // Validate booking business rules
        self.validate_booking(&booking)?;

        // Check availability
        if !self.check_availability(&booking).await? {
            return Err(AlbergueError::Validation {
                message: "No availability for requested dates and bed type".to_string(),
            });
        }

        // Save booking
        let saved_booking = self.booking_repository.save(booking).await?;

        // Send notification (wasm32 only — uses console_log via wasm_bindgen)
        #[cfg(target_arch = "wasm32")]
        self.notification_sender
            .send_booking_confirmation(&saved_booking)
            .await?;

        Ok(saved_booking.to_dto())
    }

    #[allow(clippy::unused_self)]
    #[instrument(skip(self, booking))]
    pub(crate) fn validate_booking(&self, booking: &Booking) -> AlbergueResult<()> {
        // Check dates
        if booking.check_in >= booking.check_out {
            return Err(AlbergueError::Validation {
                message: "Check-in date must be before check-out date".to_string(),
            });
        }

        // Check if dates are in the future
        if booking.check_in < chrono::Utc::now() {
            return Err(AlbergueError::Validation {
                message: "Check-in date must be in the future".to_string(),
            });
        }

        // Check email format
        if !booking.guest_email.contains('@') {
            return Err(AlbergueError::Validation {
                message: "Invalid email format".to_string(),
            });
        }

        // Check name is not empty
        if booking.guest_name.trim().is_empty() {
            return Err(AlbergueError::Validation {
                message: "Guest name cannot be empty".to_string(),
            });
        }

        Ok(())
    }

    #[instrument(skip(self, booking))]
    async fn check_availability(&self, booking: &Booking) -> AlbergueResult<bool> {
        // Check for overlapping bookings
        let overlapping_bookings = self
            .booking_repository
            .find_overlapping_bookings(booking.check_in, booking.check_out, &booking.bed_type)
            .await?;

        // Simple availability check - in real implementation would check actual bed capacity
        Ok(overlapping_bookings.len() < 10) // Mock capacity
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};
    use shared::BedType;

    /// Helper: build a Booking for validation testing
    fn make_booking_for_validation(
        guest_name: &str,
        guest_email: &str,
        check_in: chrono::DateTime<Utc>,
        check_out: chrono::DateTime<Utc>,
    ) -> Booking {
        Booking::new(
            guest_name.to_string(),
            guest_email.to_string(),
            check_in,
            check_out,
            BedType::DormA,
        )
    }

    #[test]
    fn test_validate_booking_check_in_after_check_out() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2026, 8, 5, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2026, 8, 3, 10, 0, 0).unwrap();
        let booking = make_booking_for_validation("Name", "a@b.com", ci, co);
        let result = uc.validate_booking(&booking);
        assert!(result.is_err());
        let err_msg = format!("{}", result.unwrap_err());
        assert!(err_msg.contains("Check-in date must be before check-out date"));
    }

    #[test]
    fn test_validate_booking_invalid_email() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2028, 1, 1, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2028, 1, 3, 10, 0, 0).unwrap();
        let booking = make_booking_for_validation("Name", "not-an-email", ci, co);
        let result = uc.validate_booking(&booking);
        assert!(result.is_err());
        let err_msg = format!("{}", result.unwrap_err());
        assert!(err_msg.contains("Invalid email format"));
    }

    #[test]
    fn test_validate_booking_empty_name() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2028, 1, 1, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2028, 1, 3, 10, 0, 0).unwrap();
        let booking = make_booking_for_validation("  ", "a@b.com", ci, co);
        let result = uc.validate_booking(&booking);
        assert!(result.is_err());
        let err_msg = format!("{}", result.unwrap_err());
        assert!(err_msg.contains("Guest name cannot be empty"));
    }

    #[test]
    fn test_validate_booking_valid() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2028, 6, 1, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2028, 6, 3, 10, 0, 0).unwrap();
        let booking = make_booking_for_validation("Valid Guest", "valid@email.com", ci, co);
        let result = uc.validate_booking(&booking);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_execute_with_valid_booking() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2028, 6, 1, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2028, 6, 3, 10, 0, 0).unwrap();
        let dto = BookingDto {
            id: uuid::Uuid::new_v4(),
            guest_name: "Test Guest".to_string(),
            guest_email: "test@example.com".to_string(),
            check_in: ci,
            check_out: co,
            bed_type: BedType::DormA,
            status: shared::BookingStatus::Reserved,
            created_at: Utc::now(),
        };
        let result = uc.execute(dto).await;
        assert!(result.is_ok());
        let returned_dto = result.unwrap();
        assert_eq!(returned_dto.guest_name, "Test Guest");
    }

    #[tokio::test]
    async fn test_execute_rejects_invalid_dates() {
        let uc = CreateBookingUseCase::new();
        let ci = Utc.with_ymd_and_hms(2026, 8, 5, 14, 0, 0).unwrap();
        let co = Utc.with_ymd_and_hms(2026, 8, 3, 10, 0, 0).unwrap();
        let dto = BookingDto {
            id: uuid::Uuid::new_v4(),
            guest_name: "Test".to_string(),
            guest_email: "t@t.com".to_string(),
            check_in: ci,
            check_out: co,
            bed_type: BedType::DormA,
            status: shared::BookingStatus::Reserved,
            created_at: Utc::now(),
        };
        let result = uc.execute(dto).await;
        assert!(result.is_err());
    }
}
