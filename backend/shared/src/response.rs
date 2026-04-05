use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Status(u16);

impl Status {
    pub const OK: Self = Self(200);
    pub const CREATED: Self = Self(201);
    pub const BAD_REQUEST: Self = Self(400);
    pub const UNAUTHORIZED: Self = Self(401);
    pub const FORBIDDEN: Self = Self(403);
    pub const NOT_FOUND: Self = Self(404);
    pub const INTERNAL_SERVER_ERROR: Self = Self(500);

    #[must_use]
    pub const fn code(self) -> u16 {
        self.0
    }
}

impl std::fmt::Display for Status {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

impl ErrorResponse {
    #[must_use]
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            error: message.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    #[must_use]
    pub const fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            message: None,
        }
    }

    #[must_use]
    pub const fn error(message: String) -> Self {
        Self {
            success: false,
            data: None,
            message: Some(message),
        }
    }
}

impl<T> From<T> for ApiResponse<T> {
    fn from(data: T) -> Self {
        Self::success(data)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- Status ---

    #[test]
    fn test_status_constants() {
        assert_eq!(Status::OK.code(), 200);
        assert_eq!(Status::CREATED.code(), 201);
        assert_eq!(Status::BAD_REQUEST.code(), 400);
        assert_eq!(Status::UNAUTHORIZED.code(), 401);
        assert_eq!(Status::FORBIDDEN.code(), 403);
        assert_eq!(Status::NOT_FOUND.code(), 404);
        assert_eq!(Status::INTERNAL_SERVER_ERROR.code(), 500);
    }

    #[test]
    fn test_status_display() {
        assert_eq!(format!("{}", Status::OK), "200");
        assert_eq!(format!("{}", Status::NOT_FOUND), "404");
        assert_eq!(format!("{}", Status::INTERNAL_SERVER_ERROR), "500");
    }

    #[test]
    fn test_status_equality() {
        assert_eq!(Status::OK, Status::OK);
        assert_ne!(Status::OK, Status::NOT_FOUND);
    }

    #[test]
    fn test_status_clone_copy() {
        let s = Status::OK;
        let s2 = s;
        let s3 = s;
        assert_eq!(s2, s3);
    }

    #[test]
    fn test_status_debug() {
        let debug = format!("{:?}", Status::OK);
        assert!(debug.contains("200"));
    }

    // --- ErrorResponse ---

    #[test]
    fn test_error_response_new_str() {
        let resp = ErrorResponse::new("something went wrong");
        assert_eq!(resp.error, "something went wrong");
    }

    #[test]
    fn test_error_response_new_string() {
        let resp = ErrorResponse::new("owned string".to_string());
        assert_eq!(resp.error, "owned string");
    }

    #[test]
    fn test_error_response_serialize() {
        let resp = ErrorResponse::new("bad request");
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains(r#""error":"bad request""#));
    }

    #[test]
    fn test_error_response_clone() {
        let resp = ErrorResponse::new("error");
        let cloned = resp.clone();
        assert_eq!(cloned.error, resp.error);
    }

    // --- ApiResponse ---

    #[test]
    fn test_api_response_success() {
        let resp = ApiResponse::success(42);
        assert!(resp.success);
        assert_eq!(resp.data, Some(42));
        assert!(resp.message.is_none());
    }

    #[test]
    fn test_api_response_error() {
        let resp: ApiResponse<String> = ApiResponse::error("not found".to_string());
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.message, Some("not found".to_string()));
    }

    #[test]
    fn test_api_response_serialize_success() {
        let resp = ApiResponse::success("hello");
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains(r#""success":true"#));
        assert!(json.contains(r#""data":"hello""#));
    }

    #[test]
    fn test_api_response_serialize_error() {
        let resp: ApiResponse<String> = ApiResponse::error("oops".to_string());
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains(r#""success":false"#));
        assert!(json.contains(r#""message":"oops""#));
    }

    #[test]
    fn test_api_response_from_impl() {
        let resp: ApiResponse<i32> = 99.into();
        assert!(resp.success);
        assert_eq!(resp.data, Some(99));
    }

    #[test]
    fn test_api_response_from_string() {
        let resp: ApiResponse<String> = "test data".to_string().into();
        assert!(resp.success);
        assert_eq!(resp.data, Some("test data".to_string()));
    }

    #[test]
    fn test_api_response_clone() {
        let resp = ApiResponse::success(10);
        let cloned = resp.clone();
        assert_eq!(cloned.data, resp.data);
        assert_eq!(cloned.success, resp.success);
    }

    #[test]
    fn test_api_response_debug() {
        let resp = ApiResponse::success("data");
        let debug = format!("{resp:?}");
        assert!(debug.contains("success: true"));
    }
}
