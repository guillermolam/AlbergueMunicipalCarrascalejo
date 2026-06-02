use serde::{Deserialize, Serialize};
use shared::constants::{Booking, Room, DashboardStats, OccupancyStats, Pricing};

/// Storage port abstracting over different storage backends (Spin KV, Cloudflare KV, etc.)
pub trait StoragePort {
    fn get_bookings(&self) -> Vec<Booking>;
    fn get_rooms(&self) -> Vec<Room>;
    fn get_dashboard_stats(&self) -> DashboardStats;
    fn get_pricing(&self) -> Pricing;
    // Note: create_booking would typically mutate state, but for simplicity we omit it here.
    // In a real implementation, we would have a method to add a booking.
}

/// In-memory storage implementation using hardcoded data.
pub struct InMemoryStorage;

impl StoragePort for InMemoryStorage {
    fn get_bookings(&self) -> Vec<Booking> {
        vec![Booking {
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
        }]
    }

    fn get_rooms(&self) -> Vec<Room> {
        vec![
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
        ]
    }

    fn get_dashboard_stats(&self) -> DashboardStats {
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

    fn get_pricing(&self) -> Pricing {
        Pricing { dormitory: 15 }
    }
}
