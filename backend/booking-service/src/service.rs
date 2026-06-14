use spin_sdk::http::Response;

use crate::json_response;
use crate::storage::StoragePort;

pub fn get_bookings(storage: &dyn StoragePort) -> Response {
    let bookings = storage.snapshot().bookings;
    json_response(200, &bookings)
}

pub fn get_dashboard_stats(storage: &dyn StoragePort) -> Response {
    let stats = storage.snapshot().dashboard_stats;
    json_response(200, &stats)
}

pub fn get_pricing(storage: &dyn StoragePort) -> Response {
    let pricing = storage.snapshot().pricing;
    json_response(200, &pricing)
}

pub fn get_rooms(storage: &dyn StoragePort) -> Response {
    let rooms = storage.snapshot().rooms;
    json_response(200, &rooms)
}
