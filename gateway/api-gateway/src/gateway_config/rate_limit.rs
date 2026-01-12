use crate::gateway_config::defaults::{default_rate_max_requests, default_rate_window_seconds};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct RateLimitPolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_rate_window_seconds")]
    pub window_seconds: u64,
    #[serde(default = "default_rate_max_requests")]
    pub max_requests: u64,
    #[serde(default = "default_rate_key")]
    pub key: RateLimitKey,
}

impl Default for RateLimitPolicy {
    fn default() -> Self {
        Self {
            enabled: false,
            window_seconds: default_rate_window_seconds(),
            max_requests: default_rate_max_requests(),
            key: default_rate_key(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct RateLimitPolicyOverride {
    pub enabled: Option<bool>,
    pub window_seconds: Option<u64>,
    pub max_requests: Option<u64>,
    pub key: Option<RateLimitKey>,
}

impl RateLimitPolicy {
    pub fn apply(&self, o: Option<&RateLimitPolicyOverride>) -> RateLimitPolicy {
        let Some(o) = o else {
            return self.clone();
        };
        RateLimitPolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            window_seconds: o.window_seconds.unwrap_or(self.window_seconds),
            max_requests: o.max_requests.unwrap_or(self.max_requests),
            key: o.key.clone().unwrap_or_else(|| self.key.clone()),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RateLimitKey {
    Sub,
    CorrelationId,
}

fn default_rate_key() -> RateLimitKey {
    RateLimitKey::Sub
}
