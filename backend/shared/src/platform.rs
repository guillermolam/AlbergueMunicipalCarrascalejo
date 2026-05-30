use anyhow::Result;

/// Abstracted HTTP request type
#[cfg(feature = "spin")]
pub type HttpRequest = spin_sdk::http::Request;
#[cfg(feature = "workers")]
pub type HttpRequest = worker::Request;

/// Abstracted HTTP response type
#[cfg(feature = "spin")]
pub type HttpResponse = spin_sdk::http::Response;
#[cfg(feature = "workers")]
pub type HttpResponse = worker::Response;

/// Abstracted HTTP method
#[cfg(feature = "spin")]
pub type HttpMethod = spin_sdk::http::Method;
#[cfg(feature = "workers")]
pub type HttpMethod = worker::Method;

/// Abstracted key-value store
#[cfg(feature = "spin")]
pub type KvStore = spin_sdk::key_value::Store;
#[cfg(feature = "workers")]
pub type KvStore = worker::kv::KvStore;

/// Abstracted configuration access
#[cfg(feature = "spin")]
pub fn get_config(key: &str) -> Option<String> {
    spin_sdk::variables::get(key)
}
#[cfg(feature = "workers")]
pub fn get_config(key: &str) -> Option<String> {
    worker::Secret::from_env(key)
        .ok()
        .map(|secret| secret.to_string())
}

/// Abstracted timer/sleep function
#[cfg(feature = "spin")]
pub async fn sleep(ms: u64) {
    spin_sdk::trigger::sleep(std::time::Duration::from_millis(ms)).await;
}
#[cfg(feature = "workers")]
pub async fn sleep(ms: u64) {
    use futures::timer::Delay;
    use std::time::Duration;
    Delay::new(Duration::from_millis(ms)).await;
}

/// Abstracted outbound HTTP client
#[cfg(feature = "spin")]
pub async fn http_request(
    method: HttpMethod,
    url: &str,
    body: Option<&[u8]>,
) -> Result<HttpResponse> {
    let mut client = spin_sdk::http::Client::new();
    let mut request = spin_sdk::http::Request::new(method, url);
    if let Some(body) = body {
        request.set_body(body);
    }
    Ok(client.send(request).await?)
}
#[cfg(feature = "workers")]
pub async fn http_request(
    method: HttpMethod,
    url: &str,
    body: Option<&[u8]>,
) -> Result<HttpResponse> {
    let mut req = worker::Request::new(url, worker::RequestInit::default());
    req.set_method(method);
    if let Some(body) = body {
        req.set_body(Some(worker::Body::from(body)));
    }
    req.fetch().await
}