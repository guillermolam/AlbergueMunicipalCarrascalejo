use crate::adapters::console_notification_sender::ConsoleNotificationSender;
use crate::adapters::memory_booking_repository::MemoryBookingRepository;
use crate::domain::entities::booking::Booking;
use crate::ports::booking_repository::BookingRepository;
use crate::ports::notification_sender::NotificationSender;
use shared::{AlbergueError, AlbergueResult, BookingDto};

pub struct CreateBookingUseCase {
    booking_repository: MemoryBookingRepository,
    notification_sender: ConsoleNotificationSender,
}

impl CreateBookingUseCase {
    pub fn new() -> Self {
        Self {
            booking_repository: MemoryBookingRepository::new(),
            notification_sender: ConsoleNotificationSender::new(),
        }
    }

    pub async fn execute(&self, booking_dto: BookingDto) -> AlbergueResult<BookingDto> {
        // Create booking entity from DTO
        let mut booking = Booking::from_dto(booking_dto);

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

        // Send notification
        self.notification_sender
            .send_booking_confirmation(&saved_booking)
            .await?;

        Ok(saved_booking.to_dto())
    }

    fn validate_booking(&self, booking: &Booking) -> AlbergueResult<()> {
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
