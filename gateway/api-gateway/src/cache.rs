use crate::context::{AuthContext, RequestContext, CORRELATION_ID_HEADER, TRACE_ID_HEADER};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use spin_sdk::{http::Response, http::ResponseBuilder};

#[derive(Clone, Debug, Deserialize, Serialize)]
struct CachedResponse {
    status: u16,
    content_type: String,
    body: Vec<u8>,
}

pub async fn try_cache_hit(
    redis_address: &str,
    req: &spin_sdk::http::Request,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> Result<Option<Response>> {
    let method = req.method().to_string();
    if !ctx
        .policy
        .cache
        .methods
        .iter()
        .any(|m| m.eq_ignore_ascii_case(&method))
    {
        return Ok(None);
    }

    let conn = spin_sdk::redis::Connection::open(redis_address).context("redis_open_failed")?;
    let key = cache_key(req, ctx, auth);
    let Some(bytes) = conn.get(&key).context("cache_get_failed")? else {
        return Ok(None);
    };
    if bytes.is_empty() {
        return Ok(None);
    }

    let cached: CachedResponse =
        serde_json::from_slice(&bytes).context("cache_deserialize_failed")?;

    let mut response = ResponseBuilder::new(cached.status)
        .header("content-type", cached.content_type)
        .header("x-cache", "HIT")
        .body(cached.body)
        .build();

    response.set_header(CORRELATION_ID_HEADER, ctx.correlation_id.clone());
    response.set_header(TRACE_ID_HEADER, ctx.trace_id.clone());

    Ok(Some(response))
}

pub async fn try_cache_store(
    redis_address: &str,
    req: &spin_sdk::http::Request,
    response: &Response,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> Result<()> {
    let method = req.method().to_string();
    if !ctx
        .policy
        .cache
        .methods
        .iter()
        .any(|m| m.eq_ignore_ascii_case(&method))
    {
        return Ok(());
    }

    let status = *response.status();
    if !(200..300).contains(&status) {
        return Ok(());
    }

    let body = response.body().to_vec();
    if body.len() > ctx.policy.cache.max_body_bytes {
        return Ok(());
    }

    let content_type = response
        .header("content-type")
        .and_then(|h| h.as_str())
        .unwrap_or("application/octet-stream")
        .to_string();

    let cached = CachedResponse {
        status,
        content_type,
        body,
    };

    let conn = spin_sdk::redis::Connection::open(redis_address).context("redis_open_failed")?;
    let key = cache_key(req, ctx, auth);
    let bytes = serde_json::to_vec(&cached)?;
    conn.set(&key, &bytes).context("cache_set_failed")?;

    let _ = conn.execute(
        "EXPIRE",
        &[
            spin_sdk::redis::RedisParameter::Binary(key.as_bytes().to_vec()),
            spin_sdk::redis::RedisParameter::Int64(ctx.policy.cache.ttl_seconds as i64),
        ],
    );

    Ok(())
}

fn cache_key(
    req: &spin_sdk::http::Request,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> String {
    let query = req.query();
    let query = if query.is_empty() {
        "".to_string()
    } else {
        format!("?{query}")
    };

    let sub = auth
        .and_then(|a| a.subject.clone())
        .unwrap_or_else(|| "anon".to_string());

    format!(
        "cache:{}:{}:{}{}:{}",
        ctx.service,
        req.method(),
        req.path(),
        query,
        sub
    )
}
