use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Serialize, Deserialize, Clone)]
struct RateLimitEntry {
    requests: u32,
    window_start: u64,
}

#[derive(Serialize, Deserialize)]
struct RateLimitResponse {
    allowed: bool,
    remaining: u32,
    reset_time: u64,
    retry_after: Option<u32>,
}

const WINDOW_SECONDS: u32 = 60;
const MAX_REQUESTS: u32 = 100;

fn extract_client_id(req: &Request) -> String {
    req.headers()
        .get("cf-connecting-ip")
        .ok()
        .flatten()
        .or_else(|| req.headers().get("x-forwarded-for").ok().flatten())
        .or_else(|| req.headers().get("x-real-ip").ok().flatten())
        .unwrap_or_else(|| "unknown".to_string())
}

fn now_secs() -> u64 {
    Date::now().as_millis() / 1000
}

pub async fn handle_check(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let client_id = extract_client_id(&req);
    let kv = ctx.kv("RATE_LIMIT")?;
    let key = format!("rl:{client_id}");
    let current_time = now_secs();

    let entry: Option<RateLimitEntry> = kv.get(&key).json().await?;

    let (allowed, new_entry, remaining) = if let Some(mut e) = entry {
        if current_time >= e.window_start + u64::from(WINDOW_SECONDS) {
            e.requests = 1;
            e.window_start = current_time;
            (true, e, MAX_REQUESTS - 1)
        } else if e.requests < MAX_REQUESTS {
            e.requests += 1;
            (true, e.clone(), MAX_REQUESTS - e.requests)
        } else {
            (false, e, 0)
        }
    } else {
        let e = RateLimitEntry {
            requests: 1,
            window_start: current_time,
        };
        (true, e, MAX_REQUESTS - 1)
    };

    kv.put(&key, serde_json::to_string(&new_entry)?)?
        .expiration_ttl(WINDOW_SECONDS as u64 * 2)
        .execute()
        .await?;

    let resp = RateLimitResponse {
        allowed,
        remaining,
        reset_time: new_entry.window_start + u64::from(WINDOW_SECONDS),
        retry_after: if allowed { None } else { Some(WINDOW_SECONDS) },
    };

    let mut response = if allowed {
        Response::from_json(&resp)?
    } else {
        Response::from_json(&resp)?.with_status(429)
    };

    let headers = response.headers_mut();
    headers.set("X-RateLimit-Remaining", &remaining.to_string())?;
    headers.set("X-RateLimit-Reset", &resp.reset_time.to_string())?;
    if let Some(retry) = resp.retry_after {
        headers.set("Retry-After", &retry.to_string())?;
    }

    Ok(response)
}

pub async fn handle_status(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let client_id = extract_client_id(&req);
    let kv = ctx.kv("RATE_LIMIT")?;
    let key = format!("rl:{client_id}");

    let entry: Option<RateLimitEntry> = kv.get(&key).json().await?;

    let (used, remaining) = if let Some(e) = entry {
        (e.requests, MAX_REQUESTS.saturating_sub(e.requests))
    } else {
        (0, MAX_REQUESTS)
    };

    Response::from_json(&serde_json::json!({
        "client_id": client_id,
        "window_seconds": WINDOW_SECONDS,
        "max_requests": MAX_REQUESTS,
        "used": used,
        "remaining": remaining
    }))
}

pub async fn handle_reset(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    // Require a valid admin bearer token
    let admin_token = ctx
        .var("RATE_LIMIT_ADMIN_TOKEN")
        .map(|v| v.to_string())
        .unwrap_or_default();

    let authorized = req
        .headers()
        .get("authorization")
        .ok()
        .flatten()
        .and_then(|val| val.strip_prefix("Bearer ").map(String::from))
        .map(|token| !admin_token.is_empty() && token == admin_token)
        .unwrap_or(false);

    if !authorized {
        return Response::error("Unauthorized", 401);
    }

    let body: serde_json::Value = serde_json::from_str(&req.text().await.unwrap_or_default())
        .unwrap_or(serde_json::json!({}));
    let client_id = body["client_id"].as_str().unwrap_or("unknown");

    let kv = ctx.kv("RATE_LIMIT")?;
    kv.delete(&format!("rl:{client_id}")).await?;

    Response::from_json(&serde_json::json!({
        "success": true,
        "message": format!("Rate limits reset for: {client_id}"),
        "timestamp": now_secs()
    }))
}
