use crate::gateway_config::Policy;
use spin_sdk::http::Response;

pub fn apply_security_headers(mut response: Response, policy: &Policy) -> Response {
    if !policy.security_headers.enabled {
        return response;
    }

    response.set_header("x-content-type-options", "nosniff");
    response.set_header("x-frame-options", "DENY");
    response.set_header("referrer-policy", "strict-origin-when-cross-origin");

    response.set_header(
        "access-control-allow-origin",
        policy.security_headers.cors_allow_origin.clone(),
    );
    response.set_header(
        "access-control-allow-methods",
        policy.security_headers.cors_allow_methods.clone(),
    );
    response.set_header(
        "access-control-allow-headers",
        policy.security_headers.cors_allow_headers.clone(),
    );
    if policy.security_headers.cors_allow_credentials {
        response.set_header("access-control-allow-credentials", "true");
    }
    if policy.security_headers.hsts_seconds > 0 {
        response.set_header(
            "strict-transport-security",
            format!("max-age={}", policy.security_headers.hsts_seconds),
        );
    }

    response
}
