use async_trait::async_trait;
use openidconnect::{core::CoreProviderMetadata, ClientId, ClientSecret, RedirectUrl};
use url::form_urlencoded;
use crate::config::{IdentityProvider, TokenResponse};      

pub struct LogtoProvider {
    pub metadata: CoreProviderMetadata,
    pub client_id: ClientId,
    pub client_secret: ClientSecret,
    pub redirect: RedirectUrl,
}

#[async_trait(?Send)]
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

        let body_str = form_urlencoded::Serializer::new(String::new())
            .append_pair("grant_type", "authorization_code")
            .append_pair("code", code)
            .append_pair("redirect_uri", redirect_uri)     
            .append_pair("client_id", self.client_id.as_str())
            .append_pair("client_secret", self.client_secret.secret())
            .finish();

        let req = http::Request::builder()
            .method(http::Method::POST)
            .uri(token_url.to_string())
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body_str.into_bytes())
            .unwrap();

        let resp: http::Response<Vec<u8>> = spin_sdk::http::send(req).await
            .map_err(|e| anyhow::anyhow!("Spin HTTP error: {:?}", e))?;

        if resp.status() != 200 {
            return Err(anyhow::anyhow!("Token exchange failed with status: {}", resp.status()));
        }

        let body = resp.body();
        let token_resp: TokenResponse = serde_json::from_slice(body)?;

        Ok(token_resp)
    }

    async fn refresh_token(&self, refresh_token: &str) -> anyhow::Result<TokenResponse> {
        let token_url = self
            .metadata
            .token_endpoint()
            .expect("OIDC metadata missing token_endpoint")
            .url()
            .clone();

        let body_str = form_urlencoded::Serializer::new(String::new())
            .append_pair("grant_type", "refresh_token")    
            .append_pair("refresh_token", refresh_token)   
            .append_pair("client_id", self.client_id.as_str())
            .append_pair("client_secret", self.client_secret.secret())
            .finish();

        let req = http::Request::builder()
            .method(http::Method::POST)
            .uri(token_url.to_string())
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body_str.into_bytes())
            .unwrap();

        let resp: http::Response<Vec<u8>> = spin_sdk::http::send(req).await
            .map_err(|e| anyhow::anyhow!("Spin HTTP error: {:?}", e))?;

        if resp.status() != 200 {
            return Err(anyhow::anyhow!("Token refresh failed with status: {}", resp.status()));
        }

        let body = resp.body();
        let token_resp: TokenResponse = serde_json::from_slice(body)?;

        Ok(token_resp)
    }

    fn jwks_uri(&self) -> String {
        self.metadata.jwks_uri().url().to_string()
    }
}
