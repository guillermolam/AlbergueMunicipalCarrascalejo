use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
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

#[derive(Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub type_: String,
    pub capacity: i32,
    pub price_per_night: i32,
    pub amenities: Vec<String>,
    pub available: bool,
}

#[derive(Serialize, Deserialize)]
pub struct DashboardStats {
    pub occupancy: OccupancyStats,
    pub today_bookings: i32,
    pub revenue: i32,
}

#[derive(Serialize, Deserialize)]
pub struct OccupancyStats {
    pub available: i32,
    pub occupied: i32,
    pub total: i32,
}

#[derive(Serialize, Deserialize)]
pub struct Pricing {
    pub dormitory: i32,
}
