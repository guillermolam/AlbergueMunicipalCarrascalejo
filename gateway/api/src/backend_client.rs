use anyhow::Result;
use serde::de::DeserializeOwned;

const BACKEND_BASE_URL: &str = "http://localhost:3000";

/// Make a GET request to a backend service using the Cloudflare Workers Fetch API.
pub async fn get<T: DeserializeOwned>(path: &str) -> Result<T> {
    let url = format!("{BACKEND_BASE_URL}{path}");
    let parsed_url = worker::Url::parse(&url)?;

    let mut response = worker::Fetch::Url(parsed_url)
        .send()
        .await
        .map_err(|e| anyhow::anyhow!("Fetch failed: {e}"))?;

    let body = response
        .text()
        .await
        .map_err(|e| anyhow::anyhow!("Failed to read response: {e}"))?;

    let parsed: T = serde_json::from_str(&body)?;
    Ok(parsed)
}

#[derive(Debug, serde::Deserialize)]
pub struct AuthResponse {
    pub jwt: String,
    pub refresh_token: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct UserInfo {
    pub sub: String,
    pub email: String,
    pub name: Option<String>,
}
