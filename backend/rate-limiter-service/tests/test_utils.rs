use http::{Request, Response, StatusCode};
use serde_json::Value;

#[cfg(test)]
pub mod test_utils {
    use super::*;

    /// Helper function to create a test request
    pub fn create_test_request(
        method: &str,
        uri: &str,
        body: Option<&str>,
        headers: Option<Vec<(&str, &str)>>,
    ) -> Request<Vec<u8>> {
        let mut builder = Request::builder().uri(uri).method(method);

        if let Some(headers_vec) = headers {
            for (key, value) in headers_vec {
                builder = builder.header(key, value);
            }
        }

        let body_bytes = body.map(|s| s.as_bytes().to_vec()).unwrap_or_else(Vec::new);

        builder.body(body_bytes).unwrap()
    }

    /// Helper function to parse response body as JSON
    pub async fn parse_response_body(response: impl IntoResponse) -> Value {
        let response = response.into_response();
        let body = response.into_body();
        let bytes = hyper::body::to_bytes(body).await.unwrap();
        serde_json::from_slice(&bytes).unwrap()
    }

    /// Helper function to check response status and headers
    pub fn assert_response_ok(response: impl IntoResponse) {
        let response = response.into_response();
        assert_eq!(response.status(), StatusCode::OK);

        let headers = response.headers();
        assert_eq!(headers.get("content-type").unwrap(), "application/json");
        assert_eq!(headers.get("Access-Control-Allow-Origin").unwrap(), "*");
    }

    /// Helper function to create test rate limit configuration
    pub fn create_test_config() -> HashMap<String, (u32, u32)> {
        let mut config = HashMap::new();
        config.insert("GET:/api/test".to_string(), (60, 10));
        config.insert("POST:/api/submit".to_string(), (60, 5));
        config.insert("PUT:/api/update".to_string(), (3600, 50));
        config
    }

    /// Mock time for testing
    pub struct MockTime {
        current: u64,
    }

    impl MockTime {
        pub fn new(initial: u64) -> Self {
            Self { current: initial }
        }

        pub fn advance(&mut self, seconds: u64) {
            self.current += seconds;
        }

        pub fn now(&self) -> u64 {
            self.current
        }
    }
}
