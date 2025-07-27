use crate::domain::entities::booking::Booking;
use crate::ports::notification_sender::NotificationSender;
use shared::AlbergueResult;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

pub struct ConsoleNotificationSender;

impl ConsoleNotificationSender {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait::async_trait(?Send)]
impl NotificationSender for ConsoleNotificationSender {
    async fn send_booking_confirmation(&self, booking: &Booking) -> AlbergueResult<()> {
        console_log!(
            "📧 Booking confirmation sent to {}: Booking ID {} for {} nights",
            booking.guest_email,
            booking.id,
            booking.duration_nights()
        );
        Ok(())
    }

    async fn send_booking_cancellation(&self, booking: &Booking) -> AlbergueResult<()> {
        console_log!(
            "📧 Booking cancellation sent to {}: Booking ID {} has been cancelled",
            booking.guest_email,
            booking.id
        );
        Ok(())
    }

    async fn send_payment_reminder(&self, booking: &Booking) -> AlbergueResult<()> {
        console_log!(
            "📧 Payment reminder sent to {}: Please complete payment for booking ID {}",
            booking.guest_email,
            booking.id
        );
        Ok(())
    }
}
