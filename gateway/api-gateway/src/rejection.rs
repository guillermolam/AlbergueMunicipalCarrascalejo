use crate::{context::RequestContext, security_headers::apply_security_headers};
use worker::Response;

#[allow(dead_code)]
pub enum GatewayRejection {
    Unauthorized { message: String },
    Forbidden { message: String },
    TooManyRequests { message: String },
    BadGateway { message: String },
    ServiceUnavailable { message: String },
    UnknownService,
}

impl GatewayRejection {
    pub fn into_response(self, ctx: &RequestContext) -> Response {
        let (status, error, message) = match self {
            Self::Unauthorized { message } => (401, "Unauthorized", message),
            Self::Forbidden { message } => (403, "Forbidden", message),
            Self::TooManyRequests { message } => (429, "Too Many Requests", message),
            Self::BadGateway { message } => (502, "Bad Gateway", message),
            Self::ServiceUnavailable { message } => (503, "Service Unavailable", message),
            Self::UnknownService => (404, "Not Found", "Unknown service".to_string()),
        };

        let body = serde_json::json!({
            "error": error,
            "message": message,
            "service": ctx.service,
            "correlation_id": ctx.correlation_id
        })
        .to_string();

        let mut resp = Response::error(&body, status)
            .unwrap_or_else(|_| Response::error("Internal Server Error", 500).unwrap());

        let _ = resp
            .headers_mut()
            .set(crate::context::CORRELATION_ID_HEADER, &ctx.correlation_id);
        let _ = resp
            .headers_mut()
            .set(crate::context::TRACE_ID_HEADER, &ctx.trace_id);

        apply_security_headers(resp, &ctx.policy)
    }
}
