use async_trait::async_trait;
use chrono::Duration;
use openidconnect::{core::CoreProviderMetadata, ClientId, ClientSecret, IssuerUrl, RedirectUrl};
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};

use crate::providers::github::GitHubProvider;
use crate::providers::logto::LogtoProvider;
use crate::providers::zitadel::ZitadelProvider;

#[allow(dead_code)]
#[async_trait(?Send)]
pub trait IdentityProvider: Sync + 'static {
    fn name(&self) -> &'static str {
        "identity_provider"
    }
    fn authorization_url(&self, state: &str) -> String;
    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> anyhow::Result<TokenResponse>;
    async fn refresh_token(&self, refresh_token: &str) -> anyhow::Result<TokenResponse>;
    fn jwks_uri(&self) -> String;
}

#[derive(Clone)]
pub struct AppConfig {
    pub providers: Vec<Arc<dyn IdentityProvider>>,
    pub jwt_secret: Vec<u8>,
    pub token_ttl: Duration,
    pub redirect_uri: String,
    pub client_id: String,
}

unsafe impl Send for AppConfig {}
unsafe impl Sync for AppConfig {}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
    pub expires_in: Option<i64>,
    pub token_type: String,
}

#[derive(Serialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub aud: String,
    pub iss: String,
}

pub async fn load_config() -> anyhow::Result<AppConfig> {
    let mut providers: Vec<Arc<dyn IdentityProvider>> = Vec::new();

    let redirect_uri = format!("{}/sign-in-callback", env::var("LOGTO_ORIGIN_URL")?);
    let jwt_secret = env::var("JWT_SECRET").unwrap_or_default().into_bytes();
    let ttl_secs: i64 = env::var("TOKEN_TTL")
        .unwrap_or_else(|_| "3600".into())
        .parse()?;
    let app_client_id = env::var("LOGTO_APP_ID").unwrap_or_else(|_| "workers-auth".into());

    if let (Ok(issuer), Ok(client_id), Ok(client_secret)) = (
        env::var("LOGTO_ISSUER_ENDPOINT"),
        env::var("LOGTO_APP_ID"),
        env::var("LOGTO_APP_SECRET"),
    ) {
        if let Ok(meta) = discover_oidc(&issuer).await {
            providers.push(Arc::new(LogtoProvider {
                metadata: meta,
                client_id: ClientId::new(client_id),
                client_secret: ClientSecret::new(client_secret),
                redirect: RedirectUrl::new(redirect_uri.clone())?,
            }));
        }
    }

    if let (Ok(domain), Ok(client_id), Ok(client_secret)) = (
        env::var("ZITADEL_DOMAIN"),
        env::var("LOGTO_APP_ID"),
        env::var("LOGTO_APP_SECRET"),
    ) {
        let issuer = format!("https://{domain}/oidc");
        if let Ok(meta) = discover_oidc(&issuer).await {
            providers.push(Arc::new(ZitadelProvider {
                metadata: meta,
                client_id: ClientId::new(client_id),
                client_secret: ClientSecret::new(client_secret),
                redirect: RedirectUrl::new(redirect_uri.clone())?,
            }));
        }
    }

    if let (Ok(client_id), Ok(client_secret)) = (
        env::var("GITHUB_CLIENT_ID"),
        env::var("GITHUB_CLIENT_SECRET"),
    ) {
        providers.push(Arc::new(GitHubProvider {
            client_id,
            client_secret,
            redirect_uri: redirect_uri.clone(),
        }));
    }

    Ok(AppConfig {
        providers,
        client_id: app_client_id,
        redirect_uri,
        jwt_secret,
        token_ttl: Duration::seconds(ttl_secs),
    })
}

async fn discover_oidc(issuer: &str) -> anyhow::Result<CoreProviderMetadata> {
    let http = |req: openidconnect::HttpRequest| async move {
        let method = match *req.method() {
            http::Method::POST => worker::Method::Post,
            http::Method::PUT => worker::Method::Put,
            http::Method::DELETE => worker::Method::Delete,
            _ => worker::Method::Get,
        };

        let url = req.uri().to_string();

        let headers = worker::Headers::new();
        for (key, value) in req.headers() {
            let _ = headers.set(key.as_str(), value.to_str().unwrap_or(""));
        }

        let mut init = worker::RequestInit::new();
        init.with_method(method);
        init.with_headers(headers);

        if !req.body().is_empty() {
            let body_str = String::from_utf8_lossy(req.body()).to_string();
            init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body_str)));
        }

        let worker_req = worker::Request::new_with_init(&url, &init)
            .map_err(|e| std::io::Error::other(format!("Failed to create request: {e}")))?;

        let mut response = worker::Fetch::Request(worker_req)
            .send()
            .await
            .map_err(|e| std::io::Error::other(format!("Fetch failed: {e}")))?;

        let status_code = openidconnect::http::StatusCode::from_u16(response.status_code())
            .map_err(std::io::Error::other)?;

        let builder = openidconnect::http::Response::builder().status(status_code);

        let body_bytes = response
            .bytes()
            .await
            .map_err(|e| std::io::Error::other(format!("Failed to read body: {e}")))?;

        builder
            .body(body_bytes.clone())
            .map_err(std::io::Error::other)
    };

    let meta =
        CoreProviderMetadata::discover_async(IssuerUrl::new(issuer.to_string())?, &http).await?;
    Ok(meta)
}
