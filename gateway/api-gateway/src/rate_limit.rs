//! Rate limiting module.
//!
//! Previously backed by Redis with Lua scripting. Now a stub awaiting
//! Cloudflare Rate Limiting or KV-based implementation.

use crate::{
    context::{AuthContext, RequestContext},
    rejection::GatewayRejection,
};

/// Enforce rate limits for the current request.
/// Returns `Ok(())` to allow the request through.
#[allow(clippy::unused_async)]
pub async fn enforce_rate_limit(
    _ctx: &RequestContext,
    _auth: Option<&AuthContext>,
) -> std::result::Result<(), GatewayRejection> {
    // TODO: Implement with Cloudflare Rate Limiting API or KV namespace
    // let kv = env.kv("RATE_LIMIT")?;
    // let identity = match ctx.policy.rate_limit.key { ... };
    // let key = format!("rl:{}:{}:{window_start}", ctx.service, identity);
    // ...
    Ok(())
}
