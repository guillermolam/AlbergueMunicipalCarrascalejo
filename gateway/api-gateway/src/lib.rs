#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc
)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use worker::{event, Context, Env, Method, Request, Response};

mod auth;
#[allow(dead_code)]
mod cache;
#[allow(dead_code)]
mod circuit_breaker;
mod context;
mod events;
mod gateway_config;
mod jwks_client;
#[allow(dead_code)]
mod rate_limit;
mod rejection;
mod security_headers;
mod telemetry;
#[allow(dead_code)]
mod util;

use context::{
    build_request_context, get_config, resolve_service_url, AuthContext, RequestContext,
    CORRELATION_ID_HEADER, TRACE_ID_HEADER,
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

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> worker::Result<Response> {
    telemetry::init_tracing();

    let path = req.path();
    let method = req.method();

    let result = match (method, path.as_str()) {
        (Method::Get, "/health" | "/api/health") => handle_health(&req),
        (Method::Get, "/api/gateway/camino-languages") => handle_camino_languages(&req),
        (Method::Get, "/api/services") => handle_list_services(&req).await,
        _ => handle_protected_route(req).await,
    };

    result.map_err(|e| worker::Error::RustError(e.to_string()))
}

fn handle_health(req: &Request) -> Result<Response> {
    let ctx = build_request_context(req)?;
    let mut resp = Response::ok(
        serde_json::json!({
            "status": "healthy",
            "service": "api-gateway",
            "version": env!("CARGO_PKG_VERSION")
        })
        .to_string(),
    )?;

    resp.headers_mut()
        .set(CORRELATION_ID_HEADER, &ctx.correlation_id)?;
    resp.headers_mut().set(TRACE_ID_HEADER, &ctx.trace_id)?;

    Ok(apply_security_headers(resp, &ctx.policy))
}

fn handle_camino_languages(req: &Request) -> Result<Response> {
    let ctx = build_request_context(req)?;
    let mut resp = Response::ok(
        serde_json::json!([
            { "code": "es", "name": "Español" },
            { "code": "en", "name": "English" },
            { "code": "fr", "name": "Français" },
            { "code": "de", "name": "Deutsch" },
            { "code": "it", "name": "Italiano" },
            { "code": "pt", "name": "Português" },
            { "code": "nl", "name": "Nederlands" },
            { "code": "pl", "name": "Polski" },
            { "code": "ja", "name": "日本語" },
            { "code": "ko", "name": "한국어" },
            { "code": "zh", "name": "中文" },
            { "code": "ru", "name": "Русский" }
        ])
        .to_string(),
    )?;

    resp.headers_mut()
        .set(CORRELATION_ID_HEADER, &ctx.correlation_id)?;
    resp.headers_mut().set(TRACE_ID_HEADER, &ctx.trace_id)?;

    Ok(apply_security_headers(resp, &ctx.policy))
}

async fn handle_list_services(req: &Request) -> Result<Response> {
    let ctx = build_request_context(req)?;
    if ctx.policy.auth.enabled {
        if let Err(rej) = auth::authenticate_and_authorize(req, &ctx).await {
            return Ok(rej.into_response(&ctx));
        }
    }

    let cfg = get_config()?;
    let mut services = Vec::new();
    for (name, svc) in &cfg.services {
        services.push(serde_json::json!({ "name": name, "url": svc.url }));
    }

    let resp = Response::ok(serde_json::to_string(&services)?)?;
    Ok(apply_security_headers(resp, &ctx.policy))
}

async fn handle_protected_route(mut req: Request) -> Result<Response> {
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

    if req.method() == Method::Options {
        let resp = Response::empty()?.with_status(204);
        return Ok(apply_security_headers(resp, &ctx.policy));
    }

    let auth_ctx: Option<AuthContext> = if ctx.policy.auth.enabled {
        match auth::authenticate_and_authorize(&req, &ctx).await {
            Ok(a) => Some(a),
            Err(rejection) => return Ok(rejection.into_response(&ctx)),
        }
    } else {
        None
    };

    let mut response = forward_to_service(&mut req, &ctx, auth_ctx.as_ref()).await?;

    response
        .headers_mut()
        .set(CORRELATION_ID_HEADER, &ctx.correlation_id)?;
    response.headers_mut().set(TRACE_ID_HEADER, &ctx.trace_id)?;

    let response = events::intercept_and_publish_events(response);

    Ok(apply_security_headers(response, &ctx.policy))
}

async fn forward_to_service(
    req: &mut Request,
    ctx: &RequestContext,
    _auth_ctx: Option<&AuthContext>,
) -> Result<Response> {
    let Ok(service_url) = resolve_service_url(&ctx.service) else {
        return Ok(GatewayRejection::UnknownService.into_response(ctx));
    };

    let upstream_path = rewrite_upstream_path(&req.path(), &ctx.service);
    let target_url = format!("{service_url}{upstream_path}");

    let url = worker::Url::parse(&target_url).map_err(|e| anyhow::anyhow!("Invalid URL: {e}"))?;

    let mut forward_req = Request::new_with_init(
        url.as_str(),
        worker::RequestInit::new().with_method(req.method()),
    )?;

    // Copy relevant headers
    for (name, value) in req.headers() {
        if name.starts_with("cf-") || name == "host" {
            continue;
        }
        let _ = forward_req.headers_mut().unwrap().set(&name, &value);
    }

    match worker::Fetch::Request(forward_req).send().await {
        Ok(response) => Ok(response),
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
        String::new()
    } else {
        format!("/{}", rest.join("/"))
    };

    match service {
        "auth-service" if second == "auth" => format!("/api/auth{rest_path}"),
        "location-service" if second == "countries" => format!("/api/countries{rest_path}"),
        "rate-limiter-service"
        | "security-service"
        | "reviews-service"
        | "notification-service"
        | "document-validation-service"
        | "info-on-arrival-service"
        | "booking-service" => format!("/api{rest_path}"),
        _ => path.to_string(),
    }
}
