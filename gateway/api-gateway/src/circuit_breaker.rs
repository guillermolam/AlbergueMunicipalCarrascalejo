use crate::context::RequestContext;
use anyhow::Result;
use spin_sdk::{http::Response, http::ResponseBuilder, redis};

pub async fn precheck(redis_address: &str, ctx: &RequestContext) -> Result<Option<Response>> {
    let state_key = format!("cb:{}:state", ctx.service);
    let opened_at_key = format!("cb:{}:opened_at", ctx.service);
    let probe_key = format!("cb:{}:probe", ctx.service);
    let state = redis::get(redis_address, &state_key).await.ok().unwrap_or_default();
    if state == b"open" {
        let opened_at = redis::get(redis_address, &opened_at_key)
            .await
            .ok()
            .and_then(|v| String::from_utf8(v).ok())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);
        let now = chrono::Utc::now().timestamp() as u64;
        if now < opened_at.saturating_add(ctx.policy.circuit_breaker.open_seconds) {
            let resp = ResponseBuilder::new(503)
                .header("content-type", "application/json")
                .header("retry-after", ctx.policy.circuit_breaker.open_seconds.to_string())
                .body(
                    serde_json::json!({
                        "error": "Service Unavailable",
                        "message": "Circuit open",
                        "service": ctx.service,
                        "correlation_id": ctx.correlation_id
                    })
                    .to_string(),
                )
                .build();
            return Ok(Some(resp));
        }
        let _ = redis::set(redis_address, &state_key, b"half_open").await;
        let _ = redis::execute(redis_address, "DEL", &[probe_key.as_bytes()]).await;
    }

    let state = redis::get(redis_address, &state_key).await.ok().unwrap_or_default();
    if state == b"half_open" {
        let script = r#"local ok=redis.call('SET', KEYS[1], '1', 'NX', 'EX', ARGV[1]); if ok then return 1 else return 0 end"#;
        let res = redis::execute(
            redis_address,
            "EVAL",
            &[
                script.as_bytes(),
                b"1",
                probe_key.as_bytes(),
                b"5",
            ],
        )
        .await?;

        let acquired = crate::util::parse_redis_int(&res).unwrap_or(0);
        if acquired == 0 {
            let resp = ResponseBuilder::new(503)
                .header("content-type", "application/json")
                .header("retry-after", "5")
                .body(
                    serde_json::json!({
                        "error": "Service Unavailable",
                        "message": "Circuit half-open",
                        "service": ctx.service,
                        "correlation_id": ctx.correlation_id
                    })
                    .to_string(),
                )
                .build();
            return Ok(Some(resp));
        }
    }
    Ok(None)
}

pub async fn record(redis_address: &str, ctx: &RequestContext, status: u16) -> Result<()> {
    let failures_key = format!("cb:{}:failures", ctx.service);
    let state_key = format!("cb:{}:state", ctx.service);
    let opened_at_key = format!("cb:{}:opened_at", ctx.service);
    let probe_key = format!("cb:{}:probe", ctx.service);
    let state = redis::get(redis_address, &state_key).await.ok().unwrap_or_default();

    if status >= 500 {
        if state == b"half_open" {
            let now = chrono::Utc::now().timestamp() as u64;
            let _ = redis::set(redis_address, &state_key, b"open").await;
            let _ = redis::set(redis_address, &opened_at_key, now.to_string().as_bytes()).await;
            let _ = redis::execute(redis_address, "DEL", &[failures_key.as_bytes(), probe_key.as_bytes()]).await;
            return Ok(());
        }
        let res = redis::execute(redis_address, "INCR", &[failures_key.as_bytes()]).await?;
        let failures = crate::util::parse_redis_int(&res).unwrap_or(0) as u64;
        if failures >= ctx.policy.circuit_breaker.failure_threshold {
            let now = chrono::Utc::now().timestamp() as u64;
            let _ = redis::set(redis_address, &state_key, b"open").await;
            let _ = redis::set(redis_address, &opened_at_key, now.to_string().as_bytes()).await;
            let _ = redis::execute(redis_address, "DEL", &[probe_key.as_bytes()]).await;
        }
    } else {
        let _ = redis::execute(
            redis_address,
            "DEL",
            &[failures_key.as_bytes(), opened_at_key.as_bytes(), probe_key.as_bytes()],
        )
        .await;
        let _ = redis::set(redis_address, &state_key, b"closed").await;
    }
    Ok(())
}
