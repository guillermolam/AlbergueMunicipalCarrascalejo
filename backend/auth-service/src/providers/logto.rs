use async_trait::async_trait;
use openidconnect::{core::CoreProviderMetadata, ClientId, ClientSecret, RedirectUrl};
use reqwest::Client;

use crate::config::{IdentityProvider, TokenResponse};

/// Logto provider implementation
pub struct LogtoProvider {
    pub metadata: CoreProviderMetadata,
    pub client: Client,
    pub client_id: ClientId,
    pub client_secret: ClientSecret,
    pub redirect: RedirectUrl,
}

#[async_trait]
impl IdentityProvider for LogtoProvider {
    fn name(&self) -> &'static str {
        "logto"
    }

    fn authorization_url(&self, state: &str) -> String {
        let mut auth_url = self.metadata.authorization_endpoint().url().clone();
        auth_url
            .query_pairs_mut()
            .append_pair("response_type", "code")
            .append_pair("client_id", self.client_id.as_str())
            .append_pair("redirect_uri", self.redirect.as_str())
            .append_pair("scope", "openid profile email")
            .append_pair("state", state);
        auth_url.to_string()
    }

    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> anyhow::Result<TokenResponse> {
        let token_url = self
            .metadata
            .token_endpoint()
            .expect("OIDC metadata missing token_endpoint")
            .url()
            .clone();

        let resp = self
            .client
            .post(token_url)
            .form(&[
                ("grant_type", "authorization_code"),
                ("code", code),
                ("redirect_uri", redirect_uri),
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.secret()),
            ])
            .send()
            .await?
            .error_for_status()?
            .json::<TokenResponse>()
            .await?;

        Ok(resp)
    }

    async fn refresh_token(&self, refresh_token: &str) -> anyhow::Result<TokenResponse> {
        let token_url = self
            .metadata
            .token_endpoint()
            .expect("OIDC metadata missing token_endpoint")
            .url()
            .clone();

        let resp = self
            .client
            .post(token_url)
            .form(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.secret()),
            ])
            .send()
            .await?
            .error_for_status()?
            .json::<TokenResponse>()
            .await?;

        Ok(resp)
    }

    fn jwks_uri(&self) -> String {
        self.metadata.jwks_uri().url().to_string()
    }
}
