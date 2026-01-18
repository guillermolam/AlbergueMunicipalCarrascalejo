use spin_sdk::http::{Request, Response};
use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use serde_json::json;
use std::collections::HashMap;
use http::StatusCode;

use crate::config::{AppConfig, Claims};

pub async fn login_handler(_req: Request, cfg: &AppConfig) -> anyhow::Result<Response> {
    let state = uuid::Uuid::new_v4().to_string();
    if let Some(provider) = cfg.providers.first() {     
        let url = provider.authorization_url(&state);   
        
        Ok(Response::builder()
            .status(StatusCode::TEMPORARY_REDIRECT)
            .header("Location", url)
            .body(vec![])
            .build())
    } else {
        Ok(Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body("No auth providers configured")
            .build())
    }
}

pub async fn callback_handler(req: Request, cfg: &AppConfig) -> anyhow::Result<Response> {
    let uri = req.uri();
    let query = uri.split_once('?').map(|(_, q)| q).unwrap_or("");
    let params: HashMap<String, String> = serde_urlencoded::from_str(query).unwrap_or_default();
    
    let code = match params.get("code") {
        Some(c) => c,
        None => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("Missing code")
                .build());
        },
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

    let token = match token {
        Some(t) => t,
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body(format!("Auth failed: {}", last_error))
                .build());
        },
    };

    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "spin-auth-service".into(),
    };
    let header = Header::new(Algorithm::HS256);
    let jwt = match encode(&header, &claims, &EncodingKey::from_secret(&cfg.jwt_secret)) {
        Ok(t) => t,
        Err(e) => {
             return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(e.to_string())
                .build());
        },
    };

    let body = json!({
        "jwt": jwt,
        "refresh_token": token.refresh_token,
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(serde_json::to_vec(&body)?)
        .build())
}

pub async fn logout_handler(_req: Request, _cfg: &AppConfig) -> anyhow::Result<Response> {       
    Ok(Response::builder()
        .status(StatusCode::TEMPORARY_REDIRECT)
        .header("Location", "/")
        .body(vec![])
        .build())
}

pub async fn refresh_handler(req: Request, cfg: &AppConfig) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: HashMap<String, String> = serde_json::from_slice(&body).unwrap_or_default();

    let refresh = match payload.get("refresh_token") {     
        Some(r) => r,
        None => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("Missing refresh_token")
                .build());
        },
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

    let token = match token {
        Some(t) => t,
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body(format!("Refresh failed: {}", last_error))
                .build());
        },
    };

    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "spin-auth-service".into(),
    };
    let jwt = match encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(&cfg.jwt_secret),     
    ) {
        Ok(t) => t,
        Err(e) => {
            return Ok(Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(e.to_string())
                .build());
        },
    };

    let body = json!({ "jwt": jwt });
    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(serde_json::to_vec(&body)?)
        .build())
}

pub async fn well_known_handler(_req: Request, _cfg: &AppConfig) -> anyhow::Result<Response> {
    let issuer = "https://alberguecarrascalejo.fermyon.app/api/auth";
    let config = json!({
        "issuer": issuer,
        "authorization_endpoint": format!("{}/login", issuer),
        "token_endpoint": format!("{}/callback", issuer),  
        "jwks_uri": format!("{}/.well-known/jwks.json", issuer),
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256", "HS256"],
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(serde_json::to_vec(&config)?)
        .build())
}
