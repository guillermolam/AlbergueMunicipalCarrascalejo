use crate::config::{IdentityProvider, TokenResponse};
use async_trait::async_trait;
use url::form_urlencoded;

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

        let headers = worker::Headers::new();
        headers
            .set("Accept", "application/json")
            .map_err(|e| anyhow::anyhow!("{e}"))?;
        headers
            .set("Content-Type", "application/x-www-form-urlencoded")
            .map_err(|e| anyhow::anyhow!("{e}"))?;

        let mut init = worker::RequestInit::new();
        init.with_method(worker::Method::Post);
        init.with_headers(headers);
        init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body_str)));

        let request = worker::Request::new_with_init(token_url, &init)
            .map_err(|e| anyhow::anyhow!("Failed to create request: {e}"))?;

        let mut resp = worker::Fetch::Request(request)
            .send()
            .await
            .map_err(|e| anyhow::anyhow!("Workers Fetch error: {e:?}"))?;

        if resp.status_code() != 200 {
            return Err(anyhow::anyhow!(
                "GitHub Token exchange failed with status: {}",
                resp.status_code()
            ));
        }

        let text = resp
            .text()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to read body: {e}"))?;
        let token_resp: TokenResponse = serde_json::from_str(&text)?;

        Ok(token_resp)
    }

    async fn refresh_token(&self, _refresh_token: &str) -> anyhow::Result<TokenResponse> {
        Err(anyhow::anyhow!("GitHub refresh token not implemented"))
    }

    fn jwks_uri(&self) -> String {
        String::new()
    }
}
