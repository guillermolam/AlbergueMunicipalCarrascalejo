use crate::gateway_config::Policy;
use spin_sdk::http::Response;

pub fn apply_security_headers(mut response: Response, policy: &Policy) -> Response {
    if !policy.security_headers.enabled {
        return response;
    }

    let headers = response.headers_mut();
    headers.insert("x-content-type-options", "nosniff".parse().unwrap());
    headers.insert("x-frame-options", "DENY".parse().unwrap());
    headers.insert(
        "referrer-policy",
        "strict-origin-when-cross-origin".parse().unwrap(),
    );

    headers.insert(
        "access-control-allow-origin",
        policy.security_headers.cors_allow_origin.parse().unwrap(),
    );
    headers.insert(
        "access-control-allow-methods",
        policy.security_headers.cors_allow_methods.parse().unwrap(),
    );
    headers.insert(
        "access-control-allow-headers",
        policy.security_headers.cors_allow_headers.parse().unwrap(),
    );
    if policy.security_headers.cors_allow_credentials {
        headers.insert("access-control-allow-credentials", "true".parse().unwrap());
    }
    if policy.security_headers.hsts_seconds > 0 {
        headers.insert(
            "strict-transport-security",
            format!("max-age={}", policy.security_headers.hsts_seconds)
                .parse()
                .unwrap(),
        );
    }
    response
}

