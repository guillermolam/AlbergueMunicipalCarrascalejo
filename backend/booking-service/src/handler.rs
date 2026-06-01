use spin_sdk::http::{Request, Response};
use spin_sdk::http_component;

/// Entry point for the Spin HTTP component
#[http_component]
fn handle_request(req: Request) -> Response {
    let method = req.method();
    let path = req.uri();

    match (method, path) {
        (&spin_sdk::http::Method::Get, "/bookings") => super::get_bookings(),
        (&spin_sdk::http::Method::Post, "/bookings") => super::create_booking(req),
        (&spin_sdk::http::Method::Get, "/rooms") => super::get_rooms(),
        (&spin_sdk::http::Method::Get, "/dashboard/stats") => super::get_dashboard_stats(),
        (&spin_sdk::http::Method::Get, "/pricing") => super::get_pricing(),
        _ => super::error_response(404, "Not found"),
    }
}
}