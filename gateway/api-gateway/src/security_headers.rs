use crate::gateway_config::Policy;
use worker::Response;

pub fn apply_security_headers(mut response: Response, policy: &Policy) -> Response {
    if !policy.security_headers.enabled {
        return response;
    }

    let headers = response.headers_mut();
    let _ = headers.set("x-content-type-options", "nosniff");
    let _ = headers.set("x-frame-options", "DENY");
    let _ = headers.set("referrer-policy", "strict-origin-when-cross-origin");

    let _ = headers.set(
        "access-control-allow-origin",
        &policy.security_headers.cors_allow_origin,
    );
    let _ = headers.set(
        "access-control-allow-methods",
        &policy.security_headers.cors_allow_methods,
    );
    let _ = headers.set(
        "access-control-allow-headers",
        &policy.security_headers.cors_allow_headers,
    );
    if policy.security_headers.cors_allow_credentials {
        let _ = headers.set("access-control-allow-credentials", "true");
    }
    if policy.security_headers.hsts_seconds > 0 {
        let _ = headers.set(
            "strict-transport-security",
            &format!("max-age={}", policy.security_headers.hsts_seconds),
        );
    }

    response
}
