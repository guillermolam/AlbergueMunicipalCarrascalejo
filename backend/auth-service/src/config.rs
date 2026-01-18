use async_trait::async_trait;
use chrono::Duration;
use openidconnect::{core::CoreProviderMetadata, ClientId, ClientSecret, IssuerUrl, RedirectUrl};
use serde::{Deserialize, Serialize};
use std::{env, sync::Arc};

use crate::providers::logto::LogtoProvider;
use crate::providers::zitadel::ZitadelProvider;
use crate::providers::github::GitHubProvider;

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
    let ttl_secs: i64 = env::var("TOKEN_TTL").unwrap_or_else(|_| "3600".into()).parse()?;
    let app_client_id = env::var("LOGTO_APP_ID").unwrap_or_else(|_| "spin-auth".into());

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
         let issuer = format!("https://{}/oidc", domain);
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
    let http = |req: openidconnect::HttpRequest| {
        async move {
            let mut builder = http::Request::builder()
                .method(req.method())     
                .uri(req.uri());

            for (key, value) in req.headers() {
                builder = builder.header(key.as_str(), value.as_bytes());
            }

            let body = if req.body().is_empty() {
                vec![]
            } else {
                req.body().clone()
            };

            let request = builder.body(body)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            let response: http::Response<Vec<u8>> = spin_sdk::http::send(request).await
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

            let status_code = openidconnect::http::StatusCode::from_u16(response.status().as_u16())
                 .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

            let mut builder02 = openidconnect::http::Response::builder()
                .status(status_code);

            for (key, value) in response.headers() {
                builder02 = builder02.header(key.as_str(), value.as_bytes());
            }

            let body_bytes = response.body().clone();

            builder02.body(body_bytes).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))       
        }
    };

    let meta = CoreProviderMetadata::discover_async(IssuerUrl::new(issuer.to_string())?, &http).await?;      
    Ok(meta)
}
