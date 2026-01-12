use crate::gateway_config::defaults::{
    default_cors_allow_headers, default_cors_allow_methods, default_cors_allow_origin, default_true,
};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct SecurityHeadersPolicy {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_cors_allow_origin")]
    pub cors_allow_origin: String,
    #[serde(default = "default_cors_allow_methods")]
    pub cors_allow_methods: String,
    #[serde(default = "default_cors_allow_headers")]
    pub cors_allow_headers: String,
    #[serde(default)]
    pub cors_allow_credentials: bool,
    #[serde(default)]
    pub hsts_seconds: u64,
}

impl Default for SecurityHeadersPolicy {
    fn default() -> Self {
        Self {
            enabled: true,
            cors_allow_origin: default_cors_allow_origin(),
            cors_allow_methods: default_cors_allow_methods(),
            cors_allow_headers: default_cors_allow_headers(),
            cors_allow_credentials: false,
            hsts_seconds: 0,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct SecurityHeadersPolicyOverride {
    pub enabled: Option<bool>,
    pub cors_allow_origin: Option<String>,
    pub cors_allow_methods: Option<String>,
    pub cors_allow_headers: Option<String>,
    pub cors_allow_credentials: Option<bool>,
    pub hsts_seconds: Option<u64>,
}

impl SecurityHeadersPolicy {
    pub fn apply(&self, o: Option<&SecurityHeadersPolicyOverride>) -> SecurityHeadersPolicy {
        let Some(o) = o else {
            return self.clone();
        };
        SecurityHeadersPolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            cors_allow_origin: o
                .cors_allow_origin
                .clone()
                .unwrap_or_else(|| self.cors_allow_origin.clone()),
            cors_allow_methods: o
                .cors_allow_methods
                .clone()
                .unwrap_or_else(|| self.cors_allow_methods.clone()),
            cors_allow_headers: o
                .cors_allow_headers
                .clone()
                .unwrap_or_else(|| self.cors_allow_headers.clone()),
            cors_allow_credentials: o.cors_allow_credentials.unwrap_or(self.cors_allow_credentials),
            hsts_seconds: o.hsts_seconds.unwrap_or(self.hsts_seconds),
        }
    }
}

