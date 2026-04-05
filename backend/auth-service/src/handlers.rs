use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde_json::json;
use std::collections::HashMap;
use worker::{Request, Response, Result};

use crate::config::{AppConfig, Claims};

pub async fn login_handler(_req: &Request, cfg: &AppConfig) -> Result<Response> {
    let state = uuid::Uuid::new_v4().to_string();
    if let Some(provider) = cfg.providers.first() {
        let url = provider.authorization_url(&state);

        let mut resp = Response::ok("")?;
        resp.headers_mut().set("Location", &url)?;
        Ok(resp.with_status(307))
    } else {
        Response::error("No auth providers configured", 500)
    }
}

pub async fn callback_handler(req: &Request, cfg: &AppConfig) -> Result<Response> {
    let url = req.url()?;
    let query = url.query().unwrap_or("");
    let params: HashMap<String, String> = serde_urlencoded::from_str(query).unwrap_or_default();

    let Some(code) = params.get("code") else {
        return Response::error("Missing code", 400);
    };

    let mut token = None;
    let mut last_error = String::new();

    for provider in &cfg.providers {
        match provider.exchange_code(code, &cfg.redirect_uri).await {
            Ok(t) => {
                token = Some(t);
                break;
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    let Some(token) = token else {
        return Response::error(format!("Auth failed: {last_error}"), 401);
    };

    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "workers-auth-service".into(),
    };
    let header = Header::new(Algorithm::HS256);
    let jwt = match encode(&header, &claims, &EncodingKey::from_secret(&cfg.jwt_secret)) {
        Ok(t) => t,
        Err(e) => {
            return Response::error(e.to_string(), 500);
        }
    };

    let body = json!({
        "jwt": jwt,
        "refresh_token": token.refresh_token,
    });

    Response::from_json(&body)
}

pub async fn logout_handler(_req: &Request, _cfg: &AppConfig) -> Result<Response> {
    let mut resp = Response::ok("")?;
    resp.headers_mut().set("Location", "/")?;
    Ok(resp.with_status(307))
}

pub async fn refresh_handler(req: &mut Request, cfg: &AppConfig) -> Result<Response> {
    let body = req.text().await?;
    let payload: HashMap<String, String> = serde_json::from_str(&body).unwrap_or_default();

    let Some(refresh) = payload.get("refresh_token") else {
        return Response::error("Missing refresh_token", 400);
    };

    let mut token = None;
    let mut last_error = String::new();

    for provider in &cfg.providers {
        match provider.refresh_token(refresh).await {
            Ok(t) => {
                token = Some(t);
                break;
            }
            Err(e) => {
                last_error = e.to_string();
            }
        }
    }

    let Some(token) = token else {
        return Response::error(format!("Refresh failed: {last_error}"), 401);
    };

    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "workers-auth-service".into(),
    };
    let jwt = match encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(&cfg.jwt_secret),
    ) {
        Ok(t) => t,
        Err(e) => {
            return Response::error(e.to_string(), 500);
        }
    };

    let body = json!({ "jwt": jwt });
    Response::from_json(&body)
}

pub async fn well_known_handler(_req: &Request, _cfg: &AppConfig) -> Result<Response> {
    let issuer = "https://alberguecarrascalejo.workers.dev/api/auth";
    let config = json!({
        "issuer": issuer,
        "authorization_endpoint": format!("{}/login", issuer),
        "token_endpoint": format!("{}/callback", issuer),
        "jwks_uri": format!("{}/.well-known/jwks.json", issuer),
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256", "HS256"],
    });

    Response::from_json(&config)
}
