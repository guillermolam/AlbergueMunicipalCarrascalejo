use crate::gateway_config::defaults::{
    default_cb_failure_threshold, default_cb_half_open_max, default_cb_open_seconds,
};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct CircuitBreakerPolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_cb_failure_threshold")]
    pub failure_threshold: u64,
    #[serde(default = "default_cb_open_seconds")]
    pub open_seconds: u64,
    #[serde(default = "default_cb_half_open_max")]
    pub half_open_max: u64,
}

impl Default for CircuitBreakerPolicy {
    fn default() -> Self {
        Self {
            enabled: false,
            failure_threshold: default_cb_failure_threshold(),
            open_seconds: default_cb_open_seconds(),
            half_open_max: default_cb_half_open_max(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct CircuitBreakerPolicyOverride {
    pub enabled: Option<bool>,
    pub failure_threshold: Option<u64>,
    pub open_seconds: Option<u64>,
    pub half_open_max: Option<u64>,
}

impl CircuitBreakerPolicy {
    pub fn apply(&self, o: Option<&CircuitBreakerPolicyOverride>) -> CircuitBreakerPolicy {
        let Some(o) = o else {
            return self.clone();
        };
        CircuitBreakerPolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            failure_threshold: o.failure_threshold.unwrap_or(self.failure_threshold),
            open_seconds: o.open_seconds.unwrap_or(self.open_seconds),
            half_open_max: o.half_open_max.unwrap_or(self.half_open_max),
        }
    }
}

