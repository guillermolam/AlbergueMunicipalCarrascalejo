use async_trait::async_trait;
use url::form_urlencoded;
use crate::config::{IdentityProvider, TokenResponse};      

pub struct GitHubProvider {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_uri: String,
}

#[async_trait(?Send)]
impl IdentityProvider for GitHubProvider {
    fn name(&self) -> &'static str {
        "github"
    }

    fn authorization_url(&self, state: &str) -> String {   
        let mut url = url::Url::parse("https://github.com/login/oauth/authorize").unwrap();
        url.query_pairs_mut()
            .append_pair("client_id", &self.client_id)     
            .append_pair("redirect_uri", &self.redirect_uri)
            .append_pair("scope", "read:user user:email")  
            .append_pair("state", state);
        url.to_string()
    }

    async fn exchange_code(&self, code: &str, redirect_uri: &str) -> anyhow::Result<TokenResponse> {
        let token_url = "https://github.com/login/oauth/access_token";

        let body_str = form_urlencoded::Serializer::new(String::new())
            .append_pair("client_id", &self.client_id)     
            .append_pair("client_secret", &self.client_secret)
            .append_pair("code", code)
            .append_pair("redirect_uri", redirect_uri)     
            .finish();

        let req = http::Request::builder()
            .method(http::Method::POST)
            .uri(token_url)
            .header("Accept", "application/json")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(body_str.into_bytes())
            .unwrap();

        let resp: http::Response<Vec<u8>> = spin_sdk::http::send(req).await
            .map_err(|e| anyhow::anyhow!("Spin HTTP error: {:?}", e))?;

        if resp.status() != 200 {
            return Err(anyhow::anyhow!("GitHub Token exchange failed with status: {}", resp.status()));
        }

        let body = resp.body();
        let token_resp: TokenResponse = serde_json::from_slice(body)?;

        Ok(token_resp)
    }

    async fn refresh_token(&self, _refresh_token: &str) -> anyhow::Result<TokenResponse> {
        Err(anyhow::anyhow!("GitHub refresh token not implemented"))
    }

    fn jwks_uri(&self) -> String {
        "".to_string()
    }
}
