use async_trait::async_trait;
use chrono::{Duration};
use openidconnect::{
    core::CoreProviderMetadata,
    IssuerUrl, ClientId, ClientSecret, RedirectUrl,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use crate::providers::logto::LogtoProvider;
use crate::providers::zitadel::ZitadelProvider;

/// Generic trait for OIDC-based identity providers
#[async_trait]
pub trait IdentityProvider: Send + Sync + 'static {
    fn name(&self) -> &'static str;
    fn authorization_url(&self, state: &str) -> String;
    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> anyhow::Result<TokenResponse>;
    async fn refresh_token(&self, refresh_token: &str) -> anyhow::Result<TokenResponse>;
    fn jwks_uri(&self) -> String;
}

/// Configuration loaded from environment or file
#[derive(Clone)]
pub struct AppConfig {
    pub primary: Box<dyn IdentityProvider>,
    pub secondary: Box<dyn IdentityProvider>,
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
    pub jwt_secret: Vec<u8>,
    pub token_ttl: Duration,
}

/// OAuth2 token response common fields
#[derive(Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
}

/// JWT claims for our issued tokens
#[derive(Serialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub aud: String,
    pub iss: String,
}

pub async fn load_config() -> anyhow::Result<AppConfig> {
    let logto_issuer = env::var("LOGTO_ISSUER")?;
    let zitadel_issuer = env::var("ZITADEL_ISSUER")?;
    let client_id = env::var("CLIENT_ID")?;
    let client_secret = env::var("CLIENT_SECRET")?;
    let redirect_uri = env::var("REDIRECT_URI")?;
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_default().into_bytes();
    let ttl_secs: i64 = env::var("TOKEN_TTL").unwrap_or_else(|_| "3600".into()).parse()?;

    // Discover OIDC metadata
    let client = Client::new();
    let logto_meta = CoreProviderMetadata::discover_async(
        IssuerUrl::new(logto_issuer.clone())?,
        client.clone(),
    ).await?;
    let zitadel_meta = CoreProviderMetadata::discover_async(
        IssuerUrl::new(zitadel_issuer.clone())?,
        client.clone(),
    ).await?;

    let primary = LogtoProvider {
        metadata: logto_meta,
        client: client.clone(),
        client_id: ClientId::new(client_id.clone()),
        client_secret: ClientSecret::new(client_secret.clone()),
        redirect: RedirectUrl::new(redirect_uri.clone())?,
    };
    let secondary = ZitadelProvider {
        metadata: zitadel_meta,
        client,
        client_id: ClientId::new(client_id.clone()),
        client_secret: ClientSecret::new(client_secret.clone()),
        redirect: RedirectUrl::new(redirect_uri.clone())?,
    };

    Ok(AppConfig {
        primary: Box::new(primary),
        secondary: Box::new(secondary),
        client_id,
        client_secret,
        redirect_uri,
        jwt_secret,
        token_ttl: Duration::seconds(ttl_secs),
    })
}
