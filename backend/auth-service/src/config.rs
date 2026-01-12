use async_trait::async_trait;
use chrono::Duration;
use openidconnect::{core::CoreProviderMetadata, ClientId, ClientSecret, IssuerUrl, RedirectUrl};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};

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
///
/// Note: we store providers behind `Arc<dyn ...>` so the config can be cloned and used as Axum state.
#[derive(Clone)]
pub struct AppConfig {
    pub primary: Arc<dyn IdentityProvider>,
    pub secondary: Arc<dyn IdentityProvider>,
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
    let logto_issuer = env::var("LOGTO_ISSUER_ENDPOINT")?;
    let zitadel_domain = env::var("ZITADEL_DOMAIN")?;
    let client_id = env::var("LOGTO_APP_ID")?;
    let client_secret = env::var("LOGTO_APP_SECRET")?;
    let redirect_uri = format!("{}/sign-in-callback", env::var("LOGTO_ORIGIN_URL")?);
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_default().into_bytes();
    let ttl_secs: i64 = env::var("TOKEN_TTL")
        .unwrap_or_else(|_| "3600".into())
        .parse()?;

    // Discover OIDC metadata
    //
    // `discover_async` expects an HTTP client closure `Fn(HttpRequest) -> Future<Output = Result<HttpResponse, _>>`.
    // `openidconnect::HttpRequest` in this version does NOT include a `timeout` field, so we must not access it.
    //
    // We bridge reqwest by creating a closure that uses a captured `reqwest::Client`.
    let http_client = Client::new();
    let http = move |req: openidconnect::HttpRequest| {
        let client = http_client.clone();
        async move {
            let request = client
                .request(req.method, req.url)
                .headers(req.headers)
                .body(req.body);

            let response = request.send().await?;
            let status_code = response.status();
            let headers = response.headers().clone();
            let body = response.bytes().await?.to_vec();

            Ok(openidconnect::HttpResponse {
                status_code,
                headers,
                body,
            })
        }
    };

    let logto_meta =
        CoreProviderMetadata::discover_async(IssuerUrl::new(logto_issuer.clone())?, http).await?;

    let zitadel_issuer = format!("https://{}/oidc", zitadel_domain);
    let http_client_2 = Client::new();
    let http2 = move |req: openidconnect::HttpRequest| {
        let client = http_client_2.clone();
        async move {
            let request = client
                .request(req.method, req.url)
                .headers(req.headers)
                .body(req.body);

            let response = request.send().await?;
            let status_code = response.status();
            let headers = response.headers().clone();
            let body = response.bytes().await?.to_vec();

            Ok(openidconnect::HttpResponse {
                status_code,
                headers,
                body,
            })
        }
    };

    let zitadel_meta =
        CoreProviderMetadata::discover_async(IssuerUrl::new(zitadel_issuer.clone())?, http2)
            .await?;

    let primary = LogtoProvider {
        metadata: logto_meta,
        client: Client::new(),
        client_id: ClientId::new(client_id.clone()),
        client_secret: ClientSecret::new(client_secret.clone()),
        redirect: RedirectUrl::new(redirect_uri.clone())?,
    };
    let secondary = ZitadelProvider {
        metadata: zitadel_meta,
        client: Client::new(),
        client_id: ClientId::new(client_id.clone()),
        client_secret: ClientSecret::new(client_secret.clone()),
        redirect: RedirectUrl::new(redirect_uri.clone())?,
    };

    Ok(AppConfig {
        primary: Arc::new(primary),
        secondary: Arc::new(secondary),
        client_id,
        client_secret,
        redirect_uri,
        jwt_secret,
        token_ttl: Duration::seconds(ttl_secs),
    })
}
