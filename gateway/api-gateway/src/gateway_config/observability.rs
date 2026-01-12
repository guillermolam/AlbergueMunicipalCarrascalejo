use crate::gateway_config::defaults::default_true;
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct ObservabilityPolicy {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub log_headers: bool,
}

impl Default for ObservabilityPolicy {
    fn default() -> Self {
        Self {
            enabled: true,
            log_headers: false,
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct ObservabilityPolicyOverride {
    pub enabled: Option<bool>,
    pub log_headers: Option<bool>,
}

impl ObservabilityPolicy {
    pub fn apply(&self, o: Option<&ObservabilityPolicyOverride>) -> ObservabilityPolicy {
        let Some(o) = o else {
            return self.clone();
        };
        ObservabilityPolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            log_headers: o.log_headers.unwrap_or(self.log_headers),
        }
    }
}
