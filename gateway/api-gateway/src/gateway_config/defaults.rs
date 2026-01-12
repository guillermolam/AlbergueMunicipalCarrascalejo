pub fn default_true() -> bool {
    true
}

pub fn default_google_oidc() -> String {
    "https://accounts.google.com".to_string()
}

pub fn default_rate_window_seconds() -> u64 {
    60
}

pub fn default_rate_max_requests() -> u64 {
    120
}

pub fn default_cache_ttl_seconds() -> u64 {
    15
}

pub fn default_cache_methods() -> Vec<String> {
    vec!["GET".to_string()]
}

pub fn default_cache_max_body_bytes() -> usize {
    262_144
}

pub fn default_cors_allow_origin() -> String {
    "*".to_string()
}

pub fn default_cors_allow_methods() -> String {
    "GET,POST,PUT,PATCH,DELETE,OPTIONS".to_string()
}

pub fn default_cors_allow_headers() -> String {
    "authorization,content-type,x-correlation-id,x-trace-id".to_string()
}

pub fn default_cb_failure_threshold() -> u64 {
    5
}

pub fn default_cb_open_seconds() -> u64 {
    15
}

pub fn default_cb_half_open_max() -> u64 {
    1
}
