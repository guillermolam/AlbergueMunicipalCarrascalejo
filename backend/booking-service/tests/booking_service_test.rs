#[cfg(test)]
mod tests {
    use super::*;
    use http::{Method, Request};
    use std::collections::HashMap;

    #[test]
    fn test_get_rooms_returns_valid_data() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/rooms")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).unwrap();
        
        // Check that we get a 200 response
        assert_eq!(result.status(), 200);
        
        // Check content type
        assert_eq!(
            result.headers().get("content-type").unwrap(),
            "application/json"
        );
    }

    #[test]
    fn test_get_bookings_returns_valid_data() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/bookings")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).unwrap();
        
        assert_eq!(result.status(), 200);
        assert_eq!(
            result.headers().get("content-type").unwrap(),
            "application/json"
        );
    }

    #[test]
    fn test_create_booking_returns_created() {
        let req = Request::builder()
            .method(Method::POST)
            .uri("/bookings")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).unwrap();
        
        assert_eq!(result.status(), 201);
    }

    #[test]
    fn test_invalid_route_returns_404() {
        let req = Request::builder()
            .method(Method::GET)
            .uri("/invalid")
            .body(vec![])
            .unwrap();

        let result = handle_request(req).unwrap();
        
        assert_eq!(result.status(), 404);
    }
}