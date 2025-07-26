
use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{Request, Response};
use tokio::task;
use futures::future::try_join_all;

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
    pub recent_bookings: Vec<Booking>,
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

// Stateless pure function for generating mock bookings
fn generate_mock_booking(id: &str, name: &str, email: &str) -> Booking {
    Booking {
        id: id.to_string(),
        guest_name: name.to_string(),
        guest_email: email.to_string(),
        guest_phone: Some("+34666123456".to_string()),
        room_type: "dorm-a".to_string(),
        check_in: "2024-01-15".to_string(),
        check_out: "2024-01-16".to_string(),
        num_guests: 1,
        total_price: 1500,
        status: "confirmed".to_string(),
        payment_status: "paid".to_string(),
    }
}

// Async stateless function for fetching bookings
async fn fetch_bookings() -> Result<Vec<Booking>> {
    // Simulate async database operation
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    let bookings = vec![
        generate_mock_booking("1", "Juan Pérez", "juan@example.com"),
        generate_mock_booking("2", "María García", "maria@example.com"),
        generate_mock_booking("3", "Carlos López", "carlos@example.com"),
    ];
    
    Ok(bookings)
}

// Async stateless function for fetching occupancy stats
async fn fetch_occupancy_stats() -> Result<OccupancyStats> {
    // Simulate async operation
    tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
    
    Ok(OccupancyStats {
        available: 24,
        occupied: 6,
        total: 30,
    })
}

// Async stateless function for calculating revenue
async fn calculate_revenue() -> Result<i32> {
    // Simulate async calculation
    tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
    Ok(4500)
}

// Async stateless function for counting today's bookings
async fn count_today_bookings() -> Result<i32> {
    // Simulate async operation
    tokio::time::sleep(tokio::time::Duration::from_millis(25)).await;
    Ok(3)
}

// Async function for fetching dashboard stats with concurrent operations
async fn fetch_dashboard_stats() -> Result<DashboardStats> {
    // Execute all operations concurrently using tokio
    let (occupancy, today_bookings, revenue, recent_bookings) = tokio::try_join!(
        fetch_occupancy_stats(),
        count_today_bookings(),
        calculate_revenue(),
        fetch_bookings()
    )?;
    
    Ok(DashboardStats {
        occupancy,
        today_bookings,
        revenue,
        recent_bookings: recent_bookings.into_iter().take(5).collect(),
    })
}

// Stateless pure function for generating rooms
fn generate_rooms() -> Vec<Room> {
    vec![
        Room {
            id: "dorm-a".to_string(),
            name: "Dormitorio A".to_string(),
            type_: "shared".to_string(),
            capacity: 12,
            price_per_night: 1500,
            amenities: vec!["Taquillas".to_string(), "Enchufes".to_string(), "Ventanas".to_string()],
            available: true,
        },
        Room {
            id: "dorm-b".to_string(),
            name: "Dormitorio B".to_string(),
            type_: "shared".to_string(),
            capacity: 10,
            price_per_night: 1500,
            amenities: vec!["Taquillas".to_string(), "Enchufes".to_string(), "Aire acondicionado".to_string()],
            available: true,
        },
        Room {
            id: "private-1".to_string(),
            name: "Habitación Privada 1".to_string(),
            type_: "private".to_string(),
            capacity: 2,
            price_per_night: 3500,
            amenities: vec!["Baño privado".to_string(), "TV".to_string(), "Aire acondicionado".to_string()],
            available: true,
        },
        Room {
            id: "private-2".to_string(),
            name: "Habitación Privada 2".to_string(),
            type_: "private".to_string(),
            capacity: 2,
            price_per_night: 3500,
            amenities: vec!["Baño privado".to_string(), "TV".to_string(), "Aire acondicionado".to_string()],
            available: true,
        },
    ]
}

// Stateless pure function for response building
fn build_json_response(status: u16, data: &impl Serialize) -> Result<Response> {
    let body = serde_json::to_string(data)?;
    Ok(Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(body)
        .build())
}

// Main async handler
pub async fn handle(req: &Request) -> Result<Response> {
    let method = req.method().as_str();
    let path = req.uri().path();
    
    match (method, path) {
        ("GET", "/api/booking/bookings") => {
            let bookings = fetch_bookings().await?;
            build_json_response(200, &bookings)
        }
        ("POST", "/api/booking/bookings") => {
            // Simulate async booking creation
            let new_booking = task::spawn(async {
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                generate_mock_booking("new_id", "New Guest", "guest@example.com")
            }).await?;
            
            build_json_response(201, &new_booking)
        }
        ("GET", "/api/booking/rooms") => {
            let rooms = task::spawn(async {
                tokio::time::sleep(tokio::time::Duration::from_millis(40)).await;
                generate_rooms()
            }).await?;
            
            build_json_response(200, &rooms)
        }
        ("GET", "/api/booking/admin/stats") => {
            let stats = fetch_dashboard_stats().await?;
            build_json_response(200, &stats)
        }
        ("GET", "/api/booking/pricing") => {
            let pricing = task::spawn(async {
                tokio::time::sleep(tokio::time::Duration::from_millis(20)).await;
                Pricing { dormitory: 15 }
            }).await?;
            
            build_json_response(200, &pricing)
        }
        _ => {
            let error = serde_json::json!({"error": "Booking endpoint not found"});
            build_json_response(404, &error)
        }
    }
}
