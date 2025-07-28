use anyhow::Result;
use http::{Request, StatusCode, Method};
use spin_sdk::http::{IntoResponse, ResponseBuilder};
use spin_sdk::http_component;
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

#[http_component]
fn handle_request(req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let method = req.method();
    let path = req.uri().path();
    
    match (method, path) {
        (&Method::GET, "/bookings") => get_bookings(),
        (&Method::POST, "/bookings") => create_booking(req),
        (&Method::GET, "/rooms") => get_rooms(),
        (&Method::GET, "/dashboard/stats") => get_dashboard_stats(),
        (&Method::GET, "/pricing") => get_pricing(),
        _ => Ok(ResponseBuilder::new(StatusCode::NOT_FOUND)
            .header("content-type", "application/json")
            .body(r#"{"error":"Not found"}"#)
            .build())
    }
}

fn get_bookings() -> Result<impl IntoResponse> {
    let bookings = vec![
        Booking {
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
        }
    ];
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&bookings)?)
        .build())
}

fn create_booking(_req: Request<Vec<u8>>) -> Result<impl IntoResponse> {
    let new_booking = Booking {
        id: "new_id".to_string(),
        guest_name: "New Guest".to_string(),
        guest_email: "guest@example.com".to_string(),
        guest_phone: None,
        room_type: "dorm-a".to_string(),
        check_in: "2024-01-20".to_string(),
        check_out: "2024-01-21".to_string(),
        num_guests: 1,
        total_price: 1500,
        status: "confirmed".to_string(),
        payment_status: "pending".to_string(),
    };
    
    Ok(ResponseBuilder::new(StatusCode::CREATED)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&new_booking)?)
        .build())
}

fn get_dashboard_stats() -> Result<impl IntoResponse> {
    let stats = DashboardStats {
        occupancy: OccupancyStats {
            available: 24,
            occupied: 0,
            total: 24,
        },
        today_bookings: 3,
        revenue: 4500,
    };
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&stats)?)
        .build())
}

fn get_pricing() -> Result<impl IntoResponse> {
    let pricing = Pricing {
        dormitory: 15,
    };
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&pricing)?)
        .build())
}

fn get_rooms() -> Result<impl IntoResponse> {
    let rooms = vec![
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
    ];
    
    Ok(ResponseBuilder::new(StatusCode::OK)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&rooms)?)
        .build())
}