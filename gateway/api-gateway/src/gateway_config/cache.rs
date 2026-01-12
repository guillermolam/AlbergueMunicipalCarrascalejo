use crate::gateway_config::defaults::{
    default_cache_max_body_bytes, default_cache_methods, default_cache_ttl_seconds,
};
use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct CachePolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_cache_ttl_seconds")]
    pub ttl_seconds: u64,
    #[serde(default = "default_cache_methods")]
    pub methods: Vec<String>,
    #[serde(default)]
    pub vary_headers: Vec<String>,
    #[serde(default = "default_cache_max_body_bytes")]
    pub max_body_bytes: usize,
}

impl Default for CachePolicy {
    fn default() -> Self {
        Self {
            enabled: false,
            ttl_seconds: default_cache_ttl_seconds(),
            methods: default_cache_methods(),
            vary_headers: Vec::new(),
            max_body_bytes: default_cache_max_body_bytes(),
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
pub struct CachePolicyOverride {
    pub enabled: Option<bool>,
    pub ttl_seconds: Option<u64>,
    pub methods: Option<Vec<String>>,
    pub vary_headers: Option<Vec<String>>,
    pub max_body_bytes: Option<usize>,
}

impl CachePolicy {
    pub fn apply(&self, o: Option<&CachePolicyOverride>) -> CachePolicy {
        let Some(o) = o else {
            return self.clone();
        };
        CachePolicy {
            enabled: o.enabled.unwrap_or(self.enabled),
            ttl_seconds: o.ttl_seconds.unwrap_or(self.ttl_seconds),
            methods: o.methods.clone().unwrap_or_else(|| self.methods.clone()),
            vary_headers: o
                .vary_headers
                .clone()
                .unwrap_or_else(|| self.vary_headers.clone()),
            max_body_bytes: o.max_body_bytes.unwrap_or(self.max_body_bytes),
        }
    }
}

