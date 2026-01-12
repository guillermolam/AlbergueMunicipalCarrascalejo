use anyhow::{Context, Result};
use serde::Deserialize;
use std::{collections::BTreeMap, fs};

pub mod auth;
pub mod cache;
pub mod circuit_breaker;
pub mod defaults;
pub mod observability;
pub mod policy;
pub mod rate_limit;
pub mod security_headers;

#[allow(unused_imports)]
pub use auth::*;
#[allow(unused_imports)]
pub use cache::*;
#[allow(unused_imports)]
pub use circuit_breaker::*;
#[allow(unused_imports)]
pub use observability::*;
#[allow(unused_imports)]
pub use policy::*;
#[allow(unused_imports)]
pub use rate_limit::*;
#[allow(unused_imports)]
pub use security_headers::*;

#[derive(Clone, Debug, Deserialize)]
pub struct GatewayConfig {
    pub defaults: DefaultsConfig,
    pub services: BTreeMap<String, ServiceConfig>,
}

#[derive(Clone, Debug, Deserialize)]
pub struct DefaultsConfig {
    #[serde(default)]
    pub policy: Policy,
}

#[derive(Clone, Debug, Deserialize)]
pub struct ServiceConfig {
    pub url: String,
    #[serde(default)]
    pub policy: PolicyOverride,
}

pub fn load_from_file(path: &str) -> Result<GatewayConfig> {
    let bytes =
        fs::read(path).with_context(|| format!("Failed to read gateway config at {path}"))?;
    let text = String::from_utf8(bytes).context("Gateway config must be UTF-8")?;
    let cfg: GatewayConfig =
        toml::from_str(&text).context("Failed to parse gateway TOML config")?;
    Ok(cfg)
}
