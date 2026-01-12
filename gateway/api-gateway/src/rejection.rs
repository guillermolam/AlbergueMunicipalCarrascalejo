use crate::{context::RequestContext, security_headers::apply_security_headers};
use spin_sdk::http::{Response, ResponseBuilder};

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
            GatewayRejection::Unauthorized { message } => (401, "Unauthorized", message),
            GatewayRejection::Forbidden { message } => (403, "Forbidden", message),
            GatewayRejection::TooManyRequests { message } => (429, "Too Many Requests", message),
            GatewayRejection::BadGateway { message } => (502, "Bad Gateway", message),
            GatewayRejection::ServiceUnavailable { message } => {
                (503, "Service Unavailable", message)
            }
            GatewayRejection::UnknownService => (404, "Not Found", "Unknown service".to_string()),
        };

        let mut resp = ResponseBuilder::new(status)
            .header("content-type", "application/json")
            .body(
                serde_json::json!({
                    "error": error,
                    "message": message,
                    "service": ctx.service,
                    "correlation_id": ctx.correlation_id
                })
                .to_string(),
            )
            .build();

        let headers = resp.headers_mut();
        let _ = headers.insert(
            crate::context::CORRELATION_ID_HEADER,
            ctx.correlation_id.parse().unwrap(),
        );
        let _ = headers.insert(
            crate::context::TRACE_ID_HEADER,
            ctx.trace_id.parse().unwrap(),
        );

        apply_security_headers(resp, &ctx.policy)
    }
}
