#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Method, Params, Request, Response, ResponseBuilder, Router},
    http_component,
    key_value::Store,
    variables,
};
use tracing::{event, Level};

mod auth;
mod cache;
mod circuit_breaker;
mod context;
mod gateway_config;
mod jwks_client;
mod rate_limit;
mod rejection;
mod security_headers;
mod telemetry;
mod util;

pub fn rewrite_upstream_path_for_test(path: &str, service: &str) -> String {
    rewrite_upstream_path(path, service)
}

pub fn gateway_config_for_test(bytes: &[u8]) -> anyhow::Result<gateway_config::GatewayConfig> {
    let text = std::str::from_utf8(bytes)?;
    let cfg: gateway_config::GatewayConfig = toml::from_str(text)?;
    Ok(cfg)
}

use context::{
    build_request_context, get_config, resolve_service_url, AuthContext, RequestContext,
    CORRELATION_ID_HEADER, REDIS_ADDRESS_VAR, SERVICE_REGISTRY_STORE, TRACE_ID_HEADER,
};
use rejection::GatewayRejection;
use security_headers::apply_security_headers;

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceRegistration {
    pub name: String,
    pub url: String,
    pub health_check: String,
    pub registered_at: String,
}

#[http_component]
fn handle_gateway(req: Request) -> Result<impl IntoResponse> {
    telemetry::init_tracing();
    let mut router = Router::new();

    router.get("/health", handle_health);
    router.get("/api/health", handle_health);
    router.get("/api/gateway/camino-languages", handle_camino_languages);

    router.get_async("/api/services", handle_list_services);
    router.post_async("/api/services/register", handle_register_service);



fn handle_camino_languages(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let ctx = build_request_context(&req)?;
    let mut resp = ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!([
                { "code": "es", "name": "EspaÃƒÆ’Ã‚Â±ol" },
                { "code": "en", "name": "English" },
                { "code": "fr", "name": "FranÃƒÆ’Ã‚Â§ais" },
                { "code": "de", "name": "Deutsch" },
                { "code": "it", "name": "Italiano" },
                { "code": "pt", "name": "PortuguÃƒÆ’Ã‚Âªs" },
                { "code": "nl", "name": "Nederlands" },
                { "code": "pl", "name": "Polski" },
                { "code": "ja", "name": "ÃƒÂ¦Ã¢â‚¬â€Ã‚Â¥ÃƒÂ¦Ã…â€œÃ‚Â¬ÃƒÂ¨Ã‚ÂªÃ…Â¾" },
                { "code": "ko", "name": "ÃƒÂ­Ã¢â‚¬Â¢Ã…â€œÃƒÂªÃ‚ÂµÃ‚Â­ÃƒÂ¬Ã¢â‚¬â€œÃ‚Â´" },
                { "code": "zh", "name": "ÃƒÂ¤Ã‚Â¸Ã‚Â­ÃƒÂ¦Ã¢â‚¬â€œÃ¢â‚¬Â¡" },
                { "code": "ru", "name": "ÃƒÂÃ‚Â Ãƒâ€˜Ã†â€™Ãƒâ€˜Ã‚ÂÃƒâ€˜Ã‚ÂÃƒÂÃ‚ÂºÃƒÂÃ‚Â¸ÃƒÂÃ‚Â¹" }
            ])
            .to_string(),
        )
        .build();

    resp.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
    resp.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

    Ok(apply_security_headers(resp, &ctx.policy))
}

fn handle_health(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let ctx = build_request_context(&req)?;
    let mut resp = ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "healthy",
                "service": "api-gateway",
                "version": env!("CARGO_PKG_VERSION")
            })
            .to_string(),
        )
        .build();

    resp.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
    resp.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

    Ok(apply_security_headers(resp, &ctx.policy))
}

async fn handle_list_services(req: Request, _params: Params) -> Result<Response> {
    let ctx = build_request_context(&req)?;
    if ctx.policy.auth.enabled {
        if let Err(rej) = auth::authenticate_and_authorize(&req, &ctx).await {
            return Ok(rej.into_response(&ctx));
        }
    }

    let cfg = get_config()?;
    let mut services = Vec::new();
    for (name, svc) in cfg.services.iter() {
        services.push(serde_json::json!({ "name": name, "url": svc.url }));
    }

    let resp = ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&services)?)
        .build();

    Ok(apply_security_headers(resp, &ctx.policy))
}

async fn handle_register_service(req: Request, _params: Params) -> Result<Response> {
    let ctx = build_request_context(&req)?;
    if ctx.policy.auth.enabled {
        if let Err(rej) = auth::authenticate_and_authorize(&req, &ctx).await {
            return Ok(rej.into_response(&ctx));
        }
    }

    let registration: ServiceRegistration = serde_json::from_slice(req.body())?;

    let store = Store::open(SERVICE_REGISTRY_STORE)?;
    let key = format!("service:{}", registration.name);
    store.set(&key, &serde_json::to_vec(&registration)?)?;

    event!(
        Level::INFO,
        correlation_id = ctx.correlation_id,
        trace_id = ctx.trace_id,
        service = ctx.service,
        action = "register_service",
        registered_name = registration.name,
        registered_url = registration.url
    );

    let resp = ResponseBuilder::new(201)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&registration)?)
        .build();

    Ok(apply_security_headers(resp, &ctx.policy))
}

async fn handle_protected_route(req: Request, _params: Params) -> Result<Response> {
    let ctx = build_request_context(&req)?;

    let span = tracing::info_span!(
        "gateway_request",
        correlation_id = %ctx.correlation_id,
        trace_id = %ctx.trace_id,
        service = %ctx.service,
        method = %req.method(),
        path = %req.path()
    );
    let _enter = span.enter();

    if *req.method() == Method::Options {
        return Ok(apply_security_headers(
            ResponseBuilder::new(204).body(Vec::new()).build(),
            &ctx.policy,
        ));
    }

    event!(
        Level::INFO,
        correlation_id = ctx.correlation_id,
        trace_id = ctx.trace_id,
        method = %req.method(),
        path = %req.path(),
        service = ctx.service,
        action = "request"
    );

    let auth_ctx: Option<AuthContext> = if ctx.policy.auth.enabled {
        match auth::authenticate_and_authorize(&req, &ctx).await {
            Ok(a) => Some(a),
            Err(rejection) => return Ok(rejection.into_response(&ctx)),
        }
    } else {
        None
    };

    if ctx.policy.rate_limit.enabled {
        if let Ok(redis_address) = variables::get(REDIS_ADDRESS_VAR) {
            if let Err(rej) =
                rate_limit::enforce_rate_limit(&redis_address, &ctx, auth_ctx.as_ref()).await
            {
                return Ok(rej.into_response(&ctx));
            }
        }
    }

    if ctx.policy.cache.enabled {
        if let Ok(redis_address) = variables::get(REDIS_ADDRESS_VAR) {
            if let Ok(Some(hit)) =
                cache::try_cache_hit(&redis_address, &req, &ctx, auth_ctx.as_ref()).await
            {
                return Ok(apply_security_headers(hit, &ctx.policy));
            }
        }
    }

    if ctx.policy.circuit_breaker.enabled {
        if let Ok(redis_address) = variables::get(REDIS_ADDRESS_VAR) {
            if let Some(resp) = circuit_breaker::precheck(&redis_address, &ctx).await? {
                return Ok(apply_security_headers(resp, &ctx.policy));
            }
        }
    }

    let mut response = match forward_to_service(&req, &ctx, auth_ctx.as_ref()).await {
        Ok(r) => r,
        Err(_) => {
            return Ok(GatewayRejection::BadGateway {
                message: "Upstream request failed".to_string(),
            }
            .into_response(&ctx))
        }
    };

    if ctx.policy.circuit_breaker.enabled {
        if let Ok(redis_address) = variables::get(REDIS_ADDRESS_VAR) {
            let _ = circuit_breaker::record(&redis_address, &ctx, *response.status()).await;
        }
    }

    if ctx.policy.cache.enabled {
        if let Ok(redis_address) = variables::get(REDIS_ADDRESS_VAR) {
            let _ =
                cache::try_cache_store(&redis_address, &req, &response, &ctx, auth_ctx.as_ref())
                    .await;
        }
    }

    response.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
    response.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

    Ok(apply_security_headers(response, &ctx.policy))
}

async fn forward_to_service(
    req: &Request,
    ctx: &RequestContext,
    auth_ctx: Option<&AuthContext>,
) -> Result<Response> {
    let service_url = match resolve_service_url(&ctx.service) {
        Ok(u) => u,
        Err(_) => return Ok(GatewayRejection::UnknownService.into_response(ctx)),
    };

    let upstream_path = rewrite_upstream_path(req.path(), &ctx.service);
    let upstream_path_and_query = match req.query() {
        q if !q.is_empty() => format!("{}?{}", upstream_path, q),
        _ => upstream_path,
    };

    let mut forward_req = spin_sdk::http::Request::new(
        req.method().clone(),
        format!("{}{}", service_url, upstream_path_and_query),
    );
    *forward_req.body_mut() = req.body().to_vec();

    for (name, value) in req.headers() {
        if name.starts_with("spin-") || name == "host" {
            continue;
        }
        if let Some(v) = value.as_str() {
            forward_req.set_header(name, v);
        }
    }

    forward_req.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
    forward_req.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

    if let Some(auth) = auth_ctx {
        forward_req.set_header(
            "x-user-claims",
            serde_json::to_string(&auth.claims_for_headers)?,
        );
        if let Some(sub) = auth.subject.as_ref() {
            forward_req.set_header("x-user-sub", sub.clone());
        }
    }

    match spin_sdk::http::send::<_, Response>(forward_req).await {
        Ok(mut response) => {
            event!(
                Level::INFO,
                correlation_id = ctx.correlation_id,
                trace_id = ctx.trace_id,
                service = ctx.service,
                action = "upstream_response",
                status = *response.status()
            );

            response.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
            response.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

            Ok(response)
        }
        Err(_) => Ok(GatewayRejection::BadGateway {
            message: "Service unavailable".to_string(),
        }
        .into_response(ctx)),
    }
}

fn rewrite_upstream_path(path: &str, service: &str) -> String {
    let trimmed = path.trim_start_matches('/');
    let mut parts = trimmed.split('/');
    let first = parts.next().unwrap_or("");
    let second = parts.next().unwrap_or("");
    if first != "api" {
        return path.to_string();
    }

    let rest: Vec<&str> = parts.collect();
    let rest_path = if rest.is_empty() {
        "".to_string()
    } else {
        format!("/{}", rest.join("/"))
    };

    match (second, service) {
        ("auth", "auth-service") => format!("/api/auth{}", rest_path),
        ("countries", "location-service") => format!("/api/countries{}", rest_path),
        ("redis", "redis-service") => format!("/api/redis{}", rest_path),
        ("rate-limit", "rate-limiter-service") => format!("/api{}", rest_path),
        ("security", "security-service") => format!("/api{}", rest_path),
        ("reviews", "reviews-service") => format!("/api{}", rest_path),
        ("notifications", "notification-service") => format!("/api{}", rest_path),
        ("documents", "document-validation-service") => format!("/api{}", rest_path),
        ("info", "info-on-arrival-service") => format!("/api{}", rest_path),
        ("bookings", "booking-service") => format!("/api{}", rest_path),
        _ => path.to_string(),
    }
}




