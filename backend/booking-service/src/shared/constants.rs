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

// Sample data for in-memory storage
pub const SAMPLE_BOOKINGS: [Booking; 1] = [Booking {
    id: "1".to_string(),
    guest_name: "Juan Pérez".to_string(),
    guest_email: "juan@example.com".to_string(),
    guest_phone: Some("+34666123456".to_string()),
    room_type: "dorm-a".to_string(),
    check_in: "2024-01-15".to_string(),
    check_out: "2024-01-16".to_string(),
    num_guests: 1,
    total_price: 1500,
    status: "confirmed".to_string(),
    payment_status: "paid".to_string(),
}];

pub const SAMPLE_ROOMS: [Room; 4] = [
    Room {
        id: "dorm-a".to_string(),
        name: "Dormitorio A".to_string(),
        type_: "shared".to_string(),
        capacity: 12,
        price_per_night: 1500,
        amenities: vec![
            "Taquillas".to_string(),
            "Enchufes".to_string(),
            "Ventanas".to_string(),
        ],
        available: true,
    },
    Room {
        id: "dorm-b".to_string(),
        name: "Dormitorio B".to_string(),
        type_: "shared".to_string(),
        capacity: 10,
        price_per_night: 1500,
        amenities: vec![
            "Taquillas".to_string(),
            "Enchufes".to_string(),
            "Aire acondicionado".to_string(),
        ],
        available: true,
    },
    Room {
        id: "private-1".to_string(),
        name: "Habitación Privada 1".to_string(),
        type_: "private".to_string(),
        capacity: 2,
        price_per_night: 3500,
        amenities: vec![
            "Baño privado".to_string(),
            "TV".to_string(),
            "Aire acondicionado".to_string(),
        ],
        available: true,
    },
    Room {
        id: "private-2".to_string(),
        name: "Habitación Privada 2".to_string(),
        type_: "private".to_string(),
        capacity: 2,
        price_per_night: 3500,
        amenities: vec![
            "Baño privado".to_string(),
            "TV".to_string(),
            "Aire acondicionado".to_string(),
        ],
        available: true,
    },
];

pub const SAMPLE_DASHBOARD_STATS: DashboardStats = DashboardStats {
    occupancy: OccupancyStats {
        available: 24,
        occupied: 0,
        total: 24,
    },
    today_bookings: 3,
    revenue: 4500,
};

pub const SAMPLE_PRICING: Pricing = Pricing { dormitory: 15 };
