//! Circuit breaker module.
//!
//! Previously backed by Redis. Now a stub awaiting Cloudflare KV integration.
//! The gateway's `handle_protected_route` skips circuit breaker calls when
//! the KV namespace is not bound.

use crate::context::RequestContext;
use anyhow::Result;
use worker::Response;

/// Check if the circuit is open for the target service.
/// Returns `Ok(None)` to allow the request through (circuit closed).
#[allow(clippy::unused_async)]
pub async fn precheck(_ctx: &RequestContext) -> Result<Option<Response>> {
    // TODO: Implement with Cloudflare KV namespace binding
    // let kv = env.kv("CIRCUIT_BREAKER")?;
    // let state_key = format!("cb:{}:state", ctx.service);
    // ...
    Ok(None)
}

/// Record a response status for circuit breaker state tracking.
#[allow(clippy::unused_async)]
pub async fn record(_ctx: &RequestContext, _status: u16) -> Result<()> {
    // TODO: Implement with Cloudflare KV namespace binding
    Ok(())
}
