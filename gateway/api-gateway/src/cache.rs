use crate::{
    context::{AuthContext, RequestContext, CORRELATION_ID_HEADER, TRACE_ID_HEADER},
};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use spin_sdk::{http::Response, http::ResponseBuilder, redis};

#[derive(Clone, Debug, Deserialize, Serialize)]
struct CachedResponse {
    status: u16,
    content_type: String,
    body: Vec<u8>,
}

pub async fn try_cache_hit(
    redis_address: &str,
    req: &spin_sdk::http::Request<Vec<u8>>,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> Result<Option<Response>> {
    let method = req.method().as_str().to_string();
    if !ctx
        .policy
        .cache
        .methods
        .iter()
        .any(|m| m.eq_ignore_ascii_case(&method))
    {
        return Ok(None);
    }
    let key = cache_key(req, ctx, auth);
    let Ok(bytes) = redis::get(redis_address, &key).await else {
        return Ok(None);
    };
    if bytes.is_empty() {
        return Ok(None);
    }
    let cached: CachedResponse = serde_json::from_slice(&bytes).context("cache_deserialize_failed")?;
    let mut response = ResponseBuilder::new(cached.status)
        .header("content-type", cached.content_type)
        .header("x-cache", "HIT")
        .body(cached.body)
        .build();
    response.headers_mut().insert(
        CORRELATION_ID_HEADER,
        ctx.correlation_id.parse().context("invalid correlation id")?,
    );
    response.headers_mut().insert(
        TRACE_ID_HEADER,
        ctx.trace_id.parse().context("invalid trace id")?,
    );
    Ok(Some(response))
}

pub async fn try_cache_store(
    redis_address: &str,
    req: &spin_sdk::http::Request<Vec<u8>>,
    response: &Response,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> Result<()> {
    let method = req.method().as_str().to_string();
    if !ctx
        .policy
        .cache
        .methods
        .iter()
        .any(|m| m.eq_ignore_ascii_case(&method))
    {
        return Ok(());
    }

    let status = response.status().as_u16();
    if status < 200 || status >= 300 {
        return Ok(());
    }
    let body = response.body().clone();
    if body.len() > ctx.policy.cache.max_body_bytes {
        return Ok(());
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let cached = CachedResponse {
        status,
        content_type,
        body,
    };
    let key = cache_key(req, ctx, auth);
    let bytes = serde_json::to_vec(&cached)?;
    redis::set(redis_address, &key, &bytes).await?;
    let _ = redis::execute(
        redis_address,
        "EXPIRE",
        &[key.as_bytes(), ctx.policy.cache.ttl_seconds.to_string().as_bytes()],
    )
    .await;
    Ok(())
}

fn cache_key(req: &spin_sdk::http::Request<Vec<u8>>, ctx: &RequestContext, auth: Option<&AuthContext>) -> String {
    let query = req
        .uri()
        .query()
        .map(|q| format!("?{q}"))
        .unwrap_or_default();
    let sub = auth
        .and_then(|a| a.subject.clone())
        .unwrap_or_else(|| "anon".to_string());
    format!(
        "cache:{}:{}:{}{}:{}",
        ctx.service,
        req.method().as_str(),
        req.uri().path(),
        query,
        sub
    )
}
