use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Booking {
    pub id: String,
    pub guest_name: String,
    pub guest_email: String,
    pub guest_phone: Option<String>,
    pub room_type: String,
    pub check_in: String,
    pub check_out: String,
    pub num_guests: i32,
    pub total_price: i32,
    pub status: String,
    pub payment_status: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub type_: String,
    pub capacity: i32,
    pub price_per_night: i32,
    pub amenities: Vec<String>,
    pub available: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DashboardStats {
    pub occupancy: OccupancyStats,
    pub today_bookings: i32,
    pub revenue: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct OccupancyStats {
    pub available: i32,
    pub occupied: i32,
    pub total: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Pricing {
    pub dormitory: i32,
}

#[must_use]
pub fn sample_bookings() -> [Booking; 1] {
    [booking(BookingData {
        id: "1",
        guest_name: "Juan Pérez",
        guest_email: "juan@example.com",
        guest_phone: None,
        room_type: "dorm-a",
        check_in: "2024-01-15",
        check_out: "2024-01-16",
        num_guests: 1,
        total_price: 1500,
    })]
}

#[must_use]
pub fn sample_rooms() -> [Room; 4] {
    [
        room(
            "dorm-a",
            "Dormitorio A",
            "shared",
            12,
            1500,
            &["Taquillas", "Enchufes", "Ventanas"],
        ),
        room(
            "dorm-b",
            "Dormitorio B",
            "shared",
            10,
            1500,
            &["Taquillas", "Enchufes", "Aire acondicionado"],
        ),
        room(
            "private-1",
            "Habitación Privada 1",
            "private",
            2,
            3500,
            &["Baño privado", "TV", "Aire acondicionado"],
        ),
        room(
            "private-2",
            "Habitación Privada 2",
            "private",
            2,
            3500,
            &["Baño privado", "TV", "Aire acondicionado"],
        ),
    ]
}

#[must_use]
pub const fn sample_dashboard_stats() -> DashboardStats {
    DashboardStats {
        occupancy: OccupancyStats {
            available: 24,
            occupied: 0,
            total: 24,
        },
        today_bookings: 3,
        revenue: 4500,
    }
}

#[must_use]
pub const fn sample_pricing() -> Pricing {
    Pricing { dormitory: 15 }
}

fn booking(data: BookingData<'_>) -> Booking {
    Booking {
        id: data.id.to_string(),
        guest_name: data.guest_name.to_string(),
        guest_email: data.guest_email.to_string(),
        guest_phone: data.guest_phone.map(str::to_string),
        room_type: data.room_type.to_string(),
        check_in: data.check_in.to_string(),
        check_out: data.check_out.to_string(),
        num_guests: data.num_guests,
        total_price: data.total_price,
        status: "confirmed".to_string(),
        payment_status: "paid".to_string(),
    }
}

struct BookingData<'a> {
    id: &'a str,
    guest_name: &'a str,
    guest_email: &'a str,
    guest_phone: Option<&'a str>,
    room_type: &'a str,
    check_in: &'a str,
    check_out: &'a str,
    num_guests: i32,
    total_price: i32,
}

fn room(
    id: &str,
    name: &str,
    type_: &str,
    capacity: i32,
    price_per_night: i32,
    amenities: &[&str],
) -> Room {
    Room {
        id: id.to_string(),
        name: name.to_string(),
        type_: type_.to_string(),
        capacity,
        price_per_night,
        amenities: amenities.iter().map(ToString::to_string).collect(),
        available: true,
    }
}
