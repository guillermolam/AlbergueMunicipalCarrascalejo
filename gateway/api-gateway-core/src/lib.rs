use anyhow::{Context, Result};
use serde::Deserialize;
use std::collections::BTreeMap;

#[derive(Clone, Debug, serde::Deserialize)]
pub struct GatewayConfig {
    pub defaults: DefaultsConfig,
    pub services: BTreeMap<String, ServiceConfig>,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct DefaultsConfig {
    #[serde(default)]
    pub policy: Option<toml::Value>,
}

#[derive(Clone, Debug, serde::Deserialize)]
pub struct ServiceConfig {
    pub url: String,
    #[serde(default = "Option::default")]
    pub policy: Option<toml::Value>,
}

pub fn gateway_config_for_test(bytes: &[u8]) -> Result<GatewayConfig> {
    let text = std::str::from_utf8(bytes).context("Gateway config must be UTF-8")?;
    let cfg: GatewayConfig = toml::from_str(text).context("Failed to parse gateway TOML config")?;
    Ok(cfg)
}

pub fn rewrite_upstream_path_for_test(path: &str, service: &str) -> String {
    if service == "auth-service" {
        if let Some(rest) = path.strip_prefix("/api/auth") {
            return format!("/api/auth{rest}");
        }
    }

    if service == "location-service" {
        if let Some(rest) = path.strip_prefix("/api/countries") {
            return format!("/api/countries{rest}");
        }
    }

    path.to_string()
}


