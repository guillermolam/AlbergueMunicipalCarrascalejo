use crate::gateway_config::{
    auth::{AuthPolicy, AuthPolicyOverride},
    cache::{CachePolicy, CachePolicyOverride},
    circuit_breaker::{CircuitBreakerPolicy, CircuitBreakerPolicyOverride},
    observability::{ObservabilityPolicy, ObservabilityPolicyOverride},
    rate_limit::{RateLimitPolicy, RateLimitPolicyOverride},
    security_headers::{SecurityHeadersPolicy, SecurityHeadersPolicyOverride},
};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize, Default)]
pub struct Policy {
    #[serde(default)]
    pub auth: AuthPolicy,
    #[serde(default)]
    pub rate_limit: RateLimitPolicy,
    #[serde(default)]
    pub cache: CachePolicy,
    #[serde(default)]
    pub security_headers: SecurityHeadersPolicy,
    #[serde(default)]
    pub circuit_breaker: CircuitBreakerPolicy,
    #[serde(default)]
    pub observability: ObservabilityPolicy,
}

#[derive(Clone, Debug, Deserialize, Default)]
pub struct PolicyOverride {
    pub auth: Option<AuthPolicyOverride>,
    pub rate_limit: Option<RateLimitPolicyOverride>,
    pub cache: Option<CachePolicyOverride>,
    pub security_headers: Option<SecurityHeadersPolicyOverride>,
    pub circuit_breaker: Option<CircuitBreakerPolicyOverride>,
    pub observability: Option<ObservabilityPolicyOverride>,
}

impl Policy {
    pub fn apply(&self, overrides: &PolicyOverride) -> Policy {
        Policy {
            auth: self.auth.apply(overrides.auth.as_ref()),
            rate_limit: self.rate_limit.apply(overrides.rate_limit.as_ref()),
            cache: self.cache.apply(overrides.cache.as_ref()),
            security_headers: self
                .security_headers
                .apply(overrides.security_headers.as_ref()),
            circuit_breaker: self
                .circuit_breaker
                .apply(overrides.circuit_breaker.as_ref()),
            observability: self.observability.apply(overrides.observability.as_ref()),
        }
    }
}
