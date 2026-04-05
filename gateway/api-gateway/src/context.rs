use crate::gateway_config::{load_from_file, GatewayConfig, Policy, ServiceConfig};
use anyhow::Result;
use once_cell::sync::OnceCell;
use uuid::Uuid;

pub const CORRELATION_ID_HEADER: &str = "x-correlation-id";
pub const TRACE_ID_HEADER: &str = "x-trace-id";
pub const DEFAULT_CONFIG_PATH: &str = "/config/gateway.toml";

#[derive(Clone, Debug)]
pub struct RequestContext {
    pub correlation_id: String,
    pub trace_id: String,
    pub service: String,
    pub policy: Policy,
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct AuthContext {
    pub claims_for_headers: std::collections::HashMap<String, String>,
    pub subject: Option<String>,
    pub issuer: Option<String>,
    pub audiences: Vec<String>,
    pub scopes: Vec<String>,
    pub roles: Vec<String>,
}

static CONFIG: OnceCell<GatewayConfig> = OnceCell::new();

pub fn get_config() -> Result<&'static GatewayConfig> {
    CONFIG.get_or_try_init(|| {
        let path = std::env::var("GATEWAY_CONFIG_PATH")
            .unwrap_or_else(|_| DEFAULT_CONFIG_PATH.to_string());
        load_from_file(&path)
    })
}

pub fn extract_service_name(path: &str) -> String {
    let p = path.trim_start_matches('/');
    let mut parts = p.split('/');
    let first = parts.next().unwrap_or("");
    let second = parts.next().unwrap_or("");

    if first != "api" {
        return "unknown".to_string();
    }

    match second {
        "auth" => "auth-service".to_string(),
        "countries" => "location-service".to_string(),
        "rate-limit" => "rate-limiter-service".to_string(),
        "security" => "security-service".to_string(),
        "reviews" => "reviews-service".to_string(),
        "notifications" => "notification-service".to_string(),
        "documents" => "document-validation-service".to_string(),
        "info" => "info-on-arrival-service".to_string(),
        "bookings" => "booking-service".to_string(),
        other if !other.is_empty() => other.to_string(),
        _ => "unknown".to_string(),
    }
}

pub fn build_request_context(req: &worker::Request) -> Result<RequestContext> {
    let headers = req.headers();

    let correlation_id = headers
        .get(CORRELATION_ID_HEADER)
        .ok()
        .flatten()
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let trace_id = headers
        .get(TRACE_ID_HEADER)
        .ok()
        .flatten()
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let service = extract_service_name(&req.path());
    let cfg = get_config()?;
    let service_cfg = cfg.services.get(&service);
    let policy = match service_cfg {
        Some(svc) => cfg.defaults.policy.apply(&svc.policy),
        None => cfg.defaults.policy.clone(),
    };

    Ok(RequestContext {
        correlation_id,
        trace_id,
        service,
        policy,
    })
}

pub fn resolve_service_url(service: &str) -> Result<String> {
    let cfg = get_config()?;
    if let Some(ServiceConfig { url, .. }) = cfg.services.get(service) {
        return Ok(url.clone());
    }

    Err(anyhow::anyhow!("unknown_service"))
}
