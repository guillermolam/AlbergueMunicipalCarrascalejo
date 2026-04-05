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
