use anyhow::Result;
use serde::{de::DeserializeOwned, Serialize};
use spin_sdk::http::{Request as SpinRequest, Response as SpinResponse};
use std::str::FromStr;

const BACKEND_BASE_URL: &str = "http://localhost:3000";

pub async fn get<T: DeserializeOwned>(path: &str) -> Result<T> {
    let url = format!("{}{}", BACKEND_BASE_URL, path);
    let req = SpinRequest::get(&url);
    send_request::<(), T>(req, None).await
}

pub async fn post<T: DeserializeOwned, U: Serialize>(path: &str, body: &U) -> Result<T> {
    let url = format!("{}{}", BACKEND_BASE_URL, path);
    let req = SpinRequest::post(&url, body);
    send_request(req, Some(body)).await
}

async fn send_request<T: Serialize, U: DeserializeOwned>(
    req: SpinRequest,
    body: Option<&T>,
) -> Result<U> {
    let mut req = req;

    if let Some(body) = body {
        let body_bytes = serde_json::to_vec(body)?;
        req = req.body(body_bytes);
    }

    let res = spin_sdk::http::send(req).await?;

    if !res.status().is_success() {
        anyhow::bail!("Request failed with status: {}", res.status());
    }

    let body = res.body().as_deref().unwrap_or_default();
    let parsed: U = serde_json::from_slice(body)?;

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
