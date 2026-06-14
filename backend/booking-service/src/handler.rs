use spin_sdk::http::{Method, Request, Response};

use crate::error_response;
use crate::service::{create_booking, get_bookings, get_dashboard_stats, get_pricing, get_rooms};
use crate::storage::StoragePort;

pub fn handle_request(req: Request, storage: &dyn StoragePort) -> Response {
    let method = req.method();
    let path = req.uri();

    match (method, path) {
        (&Method::Get, "/bookings") => get_bookings(storage),
        (&Method::Post, "/bookings") => create_booking(req, storage),
        (&Method::Get, "/rooms") => get_rooms(storage),
        (&Method::Get, "/dashboard/stats") => get_dashboard_stats(storage),
        (&Method::Get, "/pricing") => get_pricing(storage),
        _ => error_response(404, "Not found"),
    }
}
