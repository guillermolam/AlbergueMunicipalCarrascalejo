use crate::{
    context::{AuthContext, RequestContext},
    rejection::GatewayRejection,
};
use anyhow::{Context as AnyhowContext, Result};
use serde::Deserialize;
use std::collections::HashMap;
use tracing::{event, Level};

use crate::jwks_client::keyset::KeyStore;

#[derive(Debug, Deserialize)]
struct OpenIdConfiguration {
    pub jwks_uri: String,
}

pub async fn authenticate_and_authorize(
    req: &worker::Request,
    ctx: &RequestContext,
) -> std::result::Result<AuthContext, GatewayRejection> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .ok()
        .flatten()
        .unwrap_or_default();

    let mut parts = auth_header.split_whitespace();
    let scheme = parts.next().unwrap_or("");
    let token = parts.next().unwrap_or("");
    if !scheme.eq_ignore_ascii_case("bearer") || token.is_empty() {
        return Err(GatewayRejection::Unauthorized {
            message: "Missing or invalid Authorization header".to_string(),
        });
    }

    let auth_ctx = validate_jwt(token, ctx, ctx.policy.auth.oidc_url.as_str())
        .await
        .map_err(|e| GatewayRejection::Unauthorized {
            message: format!("JWT validation failed: {e}"),
        })?;

    if let Some(required_issuer) = ctx.policy.auth.required_issuer.as_ref() {
        if auth_ctx
            .issuer
            .as_ref()
            .is_none_or(|v| v != required_issuer)
        {
            return Err(GatewayRejection::Forbidden {
                message: "Issuer not allowed".to_string(),
            });
        }
    }

    if let Some(required_audience) = ctx.policy.auth.required_audience.as_ref() {
        if !auth_ctx.audiences.iter().any(|a| a == required_audience) {
            return Err(GatewayRejection::Forbidden {
                message: "Audience not allowed".to_string(),
            });
        }
    }

    for required in &ctx.policy.auth.required_scopes {
        if !auth_ctx.scopes.iter().any(|s| s == required) {
            return Err(GatewayRejection::Forbidden {
                message: "Missing required scope".to_string(),
            });
        }
    }

    for required in &ctx.policy.auth.required_roles {
        if !auth_ctx.roles.iter().any(|r| r == required) {
            return Err(GatewayRejection::Forbidden {
                message: "Missing required role".to_string(),
            });
        }
    }

    event!(
        Level::INFO,
        correlation_id = ctx.correlation_id,
        trace_id = ctx.trace_id,
        service = ctx.service,
        action = "auth_ok",
        subject = auth_ctx
            .subject
            .clone()
            .unwrap_or_else(|| "unknown".to_string())
    );

    Ok(auth_ctx)
}

async fn validate_jwt(token: &str, ctx: &RequestContext, oidc_url: &str) -> Result<AuthContext> {
    // Fetch OIDC discovery document using worker Fetch API
    let config_url = format!("{oidc_url}/.well-known/openid-configuration");
    let url = worker::Url::parse(&config_url)
        .with_context(|| format!("Failed to parse OIDC URL: {config_url}"))?;

    let mut response = worker::Fetch::Url(url)
        .send()
        .await
        .with_context(|| "Failed to fetch OIDC configuration")?;

    let body = response
        .text()
        .await
        .with_context(|| "Failed to read OIDC response")?;

    let config: OpenIdConfiguration =
        serde_json::from_str(&body).with_context(|| "Failed to parse OIDC configuration")?;

    event!(
        Level::INFO,
        correlation_id = ctx.correlation_id,
        trace_id = ctx.trace_id,
        action = "oidc_discovery",
        oidc_url = oidc_url,
        jwks_uri = config.jwks_uri
    );

    verify_with_jwks(&config.jwks_uri, token, ctx).await
}

async fn verify_with_jwks(
    jwks_uri: &str,
    token: &str,
    ctx: &RequestContext,
) -> Result<AuthContext> {
    let key_store = KeyStore::new_from(jwks_uri.to_string())
        .await
        .with_context(|| format!("Failed to load JWKS from {jwks_uri}"))?;

    let jwt = key_store
        .verify(token)
        .map_err(|e| anyhow::anyhow!("JWT verification failed: {e:?}"))?;

    event!(
        Level::INFO,
        correlation_id = ctx.correlation_id,
        trace_id = ctx.trace_id,
        action = "jwt_verified"
    );

    let mut claims_for_headers = HashMap::new();
    let subject = jwt.payload().sub().map(ToString::to_string);
    let issuer = jwt.payload().iss().map(ToString::to_string);
    let mut audiences = Vec::new();

    if let Some(sub) = jwt.payload().sub() {
        claims_for_headers.insert("sub".to_string(), sub.to_string());
    }
    if let Some(iss) = jwt.payload().iss() {
        claims_for_headers.insert("iss".to_string(), iss.to_string());
    }
    if let Some(aud) = jwt.payload().get_str("aud") {
        audiences.push(aud.to_string());
        claims_for_headers.insert("aud".to_string(), aud.to_string());
    } else if let Some(arr) = jwt.payload().get_array("aud") {
        for v in arr {
            if let Some(s) = v.as_str() {
                audiences.push(s.to_string());
            }
        }
        if !audiences.is_empty() {
            claims_for_headers.insert("aud".to_string(), audiences.join(","));
        }
    }

    let mut roles = Vec::new();
    if let Some(arr) = jwt.payload().get_array("roles") {
        for v in arr {
            if let Some(s) = v.as_str() {
                roles.push(s.to_string());
            }
        }
    } else if let Some(role) = jwt.payload().get_str("role") {
        roles.push(role.to_string());
    }

    let mut scopes = Vec::new();
    if let Some(scope) = jwt.payload().get_str("scope") {
        scopes.extend(scope.split_whitespace().map(ToString::to_string));
    } else if let Some(arr) = jwt.payload().get_array("scp") {
        for v in arr {
            if let Some(s) = v.as_str() {
                scopes.push(s.to_string());
            }
        }
    }

    Ok(AuthContext {
        claims_for_headers,
        subject,
        issuer,
        audiences,
        scopes,
        roles,
    })
}
