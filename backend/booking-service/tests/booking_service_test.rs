// Integration-level tests for booking-service public types.
// The Cloudflare Workers handler (`fetch`) cannot be tested natively,
// so these tests exercise the serializable API types exported by the crate.

use booking_service::{Booking, DashboardStats, OccupancyStats, Pricing, Room};

#[test]
fn test_booking_json_contract() {
    let booking = Booking {
        id: "int-1".to_string(),
        guest_name: "Integration Test".to_string(),
        guest_email: "int@test.com".to_string(),
        guest_phone: Some("+34600000001".to_string()),
        room_type: "dorm-a".to_string(),
        check_in: "2024-06-01".to_string(),
        check_out: "2024-06-03".to_string(),
        num_guests: 2,
        total_price: 3000,
        status: "confirmed".to_string(),
        payment_status: "paid".to_string(),
    };
    let json = serde_json::to_value(&booking).unwrap();
    assert_eq!(json["id"], "int-1");
    assert_eq!(json["num_guests"], 2);
    assert_eq!(json["total_price"], 3000);
}

#[test]
fn test_room_json_contract() {
    let room = Room {
        id: "dorm-a".to_string(),
        name: "Dormitorio A".to_string(),
        type_: "shared".to_string(),
        capacity: 12,
        price_per_night: 1500,
        amenities: vec!["Taquillas".to_string()],
        available: true,
    };
    let json = serde_json::to_value(&room).unwrap();
    assert_eq!(json["capacity"], 12);
    assert_eq!(json["available"], true);
}

#[test]
fn test_dashboard_stats_json_contract() {
    let stats = DashboardStats {
        occupancy: OccupancyStats {
            available: 24,
            occupied: 0,
            total: 24,
        },
        today_bookings: 3,
        revenue: 4500,
    };
    let json = serde_json::to_value(&stats).unwrap();
    assert_eq!(json["today_bookings"], 3);
    assert_eq!(json["occupancy"]["total"], 24);
}

#[test]
fn test_pricing_json_contract() {
    let pricing = Pricing { dormitory: 15 };
    let json = serde_json::to_value(&pricing).unwrap();
    assert_eq!(json["dormitory"], 15);
}
