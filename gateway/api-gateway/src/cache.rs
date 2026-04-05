//! Response caching module.
//!
//! Previously backed by Redis. Now a stub awaiting Cloudflare KV integration.
//! The gateway `handle_protected_route` skips cache calls when the KV namespace
//! is not bound; this module is kept for future KV-based caching.

use crate::context::{AuthContext, RequestContext};
use anyhow::Result;
use worker::Response;

/// Attempt a cache hit. Returns `Ok(None)` when caching is disabled or no hit.
#[allow(clippy::unused_async)]
pub async fn try_cache_hit(
    _req: &worker::Request,
    _ctx: &RequestContext,
    _auth: Option<&AuthContext>,
) -> Result<Option<Response>> {
    // TODO: Implement with Cloudflare KV namespace binding
    // let kv = env.kv("CACHE")?;
    // let key = cache_key(req, ctx, auth);
    // if let Some(value) = kv.get(&key).text().await? { ... }
    Ok(None)
}

/// Store a response in cache. No-op until KV is integrated.
#[allow(clippy::unused_async)]
pub async fn try_cache_store(
    _req: &worker::Request,
    _response: &Response,
    _ctx: &RequestContext,
    _auth: Option<&AuthContext>,
) -> Result<()> {
    // TODO: Implement with Cloudflare KV namespace binding
    Ok(())
}
