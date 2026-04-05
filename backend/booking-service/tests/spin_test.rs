// The booking-service now uses Cloudflare Workers (worker crate).
// These placeholder tests verify the crate compiles and public types are accessible.

use booking_service::{Booking, Pricing, Room};

#[test]
fn test_crate_compiles_and_types_accessible() {
    let _booking = Booking {
        id: String::new(),
        guest_name: String::new(),
        guest_email: String::new(),
        guest_phone: None,
        room_type: String::new(),
        check_in: String::new(),
        check_out: String::new(),
        num_guests: 0,
        total_price: 0,
        status: String::new(),
        payment_status: String::new(),
    };
    let _room = Room {
        id: String::new(),
        name: String::new(),
        type_: String::new(),
        capacity: 0,
        price_per_night: 0,
        amenities: vec![],
        available: false,
    };
    let _pricing = Pricing { dormitory: 0 };
}
