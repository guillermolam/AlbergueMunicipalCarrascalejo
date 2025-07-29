use axum::{extract::{Query, State}, http::StatusCode, response::{IntoResponse, Redirect, Json}, Json as AxumJson};
use chrono::{Utc};
use jsonwebtoken::{encode, Header, EncodingKey, Algorithm};
use serde_json::json;
use std::{collections::HashMap, sync::Arc};

use crate::config::{AppConfig, Claims};

type SharedConfig = Arc<AppConfig>;

/// Redirect user to primary auth, fallback to secondary if needed
pub async fn login_handler(State(cfg): State<SharedConfig>) -> impl IntoResponse {
    let state = uuid::Uuid::new_v4().to_string();
    let url = cfg.primary.authorization_url(&state);
    Redirect::temporary(url.as_str())
}

/// Handle OAuth2 callback, exchange code, issue our JWT
pub async fn callback_handler(
    State(cfg): State<SharedConfig>,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let code = match params.get("code") {
        Some(c) => c,
        None => return (StatusCode::BAD_REQUEST, "Missing code").into_response(),
    };

    // Try primary
    let token = match cfg.primary.exchange_code(code, &cfg.redirect_uri).await {
        Ok(t) => t,
        Err(_) => {
            // fallback
            cfg.secondary
                .exchange_code(code, &cfg.redirect_uri)
                .await
                .map_err(|e| (StatusCode::UNAUTHORIZED, format!("Auth failed: {}", e))).unwrap()
        }
    };

    // Issue our own JWT
    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "spin-auth-service".into(),
    };
    let header = Header::new(Algorithm::HS256);
    let jwt = match encode(&header, &claims, &EncodingKey::from_secret(&cfg.jwt_secret)) {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    // Return JSON with tokens
    AxumJson(json!({
        "jwt": jwt,
        "refresh_token": token.refresh_token,
    }))
}

/// Clear session (client should drop JWT)
pub async fn logout_handler() -> impl IntoResponse {
    // Invalidate cookie or client-side drop
    Redirect::temporary("/")
}

/// Refresh our JWT using provider refresh token
pub async fn refresh_handler(
    State(cfg): State<SharedConfig>,
    AxumJson(payload): AxumJson<HashMap<String, String>>,
) -> impl IntoResponse {
    let refresh = match payload.get("refresh_token") {
        Some(r) => r,
        None => return (StatusCode::BAD_REQUEST, "Missing refresh_token").into_response(),
    };

    // Try primary then secondary
    let token = cfg
        .primary
        .refresh_token(refresh)
        .await
        .or_else(|_| cfg.secondary.refresh_token(refresh).await)
        .map_err(|e| (StatusCode::UNAUTHORIZED, e.to_string())).unwrap();

    // Issue new JWT
    let claims = Claims {
        sub: token.access_token.clone(),
        exp: (Utc::now() + cfg.token_ttl).timestamp() as usize,
        aud: cfg.client_id.clone(),
        iss: "spin-auth-service".into(),
    };
    let jwt = match encode(&Header::new(Algorithm::HS256), &claims, &EncodingKey::from_secret(&cfg.jwt_secret)) {
        Ok(t) => t,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    AxumJson(json!({ "jwt": jwt }))
}

/// OIDC discovery endpoint
pub async fn well_known_handler(State(_cfg): State<SharedConfig>) -> impl IntoResponse {
    let issuer = "https://your-spin-host";
    let config = json!({
        "issuer": issuer,
        "authorization_endpoint": format!("{}/login", issuer),
        "token_endpoint": format!("{}/callback", issuer),
        "jwks_uri": format!("{}/.well-known/jwks.json", issuer),
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256", "HS256"],
    });
    AxumJson(config)
}
