use crate::{
    context::{AuthContext, RequestContext},
    rejection::GatewayRejection,
    util::parse_redis_int,
};
use anyhow::Context;
use tracing::{event, Level};

#[allow(clippy::unused_async)]
pub async fn enforce_rate_limit(
    redis_address: &str,
    ctx: &RequestContext,
    auth: Option<&AuthContext>,
) -> std::result::Result<(), GatewayRejection> {
    let identity = match ctx.policy.rate_limit.key {
        crate::gateway_config::RateLimitKey::Sub => auth
            .and_then(|a| a.subject.clone())
            .unwrap_or_else(|| "anon".to_string()),
        crate::gateway_config::RateLimitKey::CorrelationId => ctx.correlation_id.clone(),
    };

    let window = ctx.policy.rate_limit.window_seconds;
    let now = chrono::Utc::now().timestamp() as u64;
    let window_start = now - (now % window);
    let key = format!("rl:{}:{}:{}", ctx.service, identity, window_start);

    let conn = spin_sdk::redis::Connection::open(redis_address)
        .context("rate_limit_redis_open_failed")
        .map_err(|e| GatewayRejection::ServiceUnavailable {
            message: format!("Rate limit backend unavailable: {e}"),
        })?;

    let script = r"local current=redis.call('INCR', KEYS[1]); if current==1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return current";

    let res = conn
        .execute(
            "EVAL",
            &[
                spin_sdk::redis::RedisParameter::Binary(script.as_bytes().to_vec()),
                spin_sdk::redis::RedisParameter::Binary(b"1".to_vec()),
                spin_sdk::redis::RedisParameter::Binary(key.as_bytes().to_vec()),
                spin_sdk::redis::RedisParameter::Int64(window as i64),
            ],
        )
        .context("rate_limit_redis_eval_failed")
        .map_err(|e| GatewayRejection::ServiceUnavailable {
            message: format!("Rate limit backend unavailable: {e}"),
        })?;

    let current = parse_redis_int(&res).unwrap_or(0);
    if current > ctx.policy.rate_limit.max_requests as i64 {
        event!(
            Level::WARN,
            correlation_id = ctx.correlation_id,
            trace_id = ctx.trace_id,
            service = ctx.service,
            action = "rate_limited",
            current = current,
            max = ctx.policy.rate_limit.max_requests
        );
        return Err(GatewayRejection::TooManyRequests {
            message: "Rate limit exceeded".to_string(),
        });
    }

    Ok(())
}
