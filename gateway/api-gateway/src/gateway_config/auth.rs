use crate::gateway_config::defaults::{default_google_oidc, default_true};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct AuthPolicy {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_google_oidc")]
    pub oidc_url: String,
    #[serde(default)]
    pub required_issuer: Option<String>,
    #[serde(default)]
    pub required_audience: Option<String>,
    #[serde(default)]
    pub required_scopes: Vec<String>,
    #[serde(default)]
    pub required_roles: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct AuthPolicyOverride {
    pub enabled: Option<bool>,
    pub oidc_url: Option<String>,
    pub required_issuer: Option<Option<String>>,
    pub required_audience: Option<Option<String>>,
    pub required_scopes: Option<Vec<String>>,
    pub required_roles: Option<Vec<String>>,
}

impl Default for AuthPolicy {
    fn default() -> Self {
        Self {
            enabled: true,
            oidc_url: default_google_oidc(),
            required_issuer: None,
            required_audience: None,
            required_scopes: Vec::new(),
            required_roles: Vec::new(),
        }
    }
}

impl AuthPolicy {
    pub fn apply(&self, o: Option<&AuthPolicyOverride>) -> AuthPolicy {
        let Some(o) = o else {
            return self.clone();
        };
        AuthPolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            oidc_url: o.oidc_url.clone().unwrap_or_else(|| self.oidc_url.clone()),
            required_issuer: o
                .required_issuer
                .clone()
                .unwrap_or_else(|| self.required_issuer.clone()),
            required_audience: o
                .required_audience
                .clone()
                .unwrap_or_else(|| self.required_audience.clone()),
            required_scopes: o
                .required_scopes
                .clone()
                .unwrap_or_else(|| self.required_scopes.clone()),
            required_roles: o
                .required_roles
                .clone()
                .unwrap_or_else(|| self.required_roles.clone()),
        }
    }
}

