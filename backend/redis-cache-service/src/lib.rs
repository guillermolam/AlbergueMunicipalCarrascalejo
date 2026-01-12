#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic, clippy::nursery)]

use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::{
    http::{IntoResponse, Method, Params, Request, Response, ResponseBuilder, Router},
    http_component, redis, variables,
};

/// Redis Cache Service Wrapper
/// Provides HTTP API for Redis operations
/// Following spin-rust-sdk redis example pattern

#[derive(Debug, Serialize, Deserialize)]
struct CacheSetRequest {
    key: String,
    value: String,
    ttl: Option<u64>, // TTL in seconds
}

#[derive(Debug, Serialize, Deserialize)]
struct CacheGetResponse {
    key: String,
    value: Option<String>,
    found: bool,
}

#[http_component]
fn handle_redis(req: Request) -> Result<impl IntoResponse> {
    let mut router = Router::default();

    router.post("/api/cache/set", handle_set);
    router.get("/api/cache/get/:key", handle_get);
    router.delete("/api/cache/delete/:key", handle_delete);
    router.post("/api/cache/increment/:key", handle_increment);
    router.get("/api/cache/keys", handle_keys);
    router.get("/api/cache/health", handle_health);
    router.get("/api/cache/stats", handle_stats);

    Ok(router.handle(req))
}

/// Set cache value
async fn handle_set(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let set_req: CacheSetRequest = serde_json::from_slice(req.body())?;
    let redis_address = variables::get("redis_address")?;

    // Set the value
    redis::set(&redis_address, &set_req.key, set_req.value.as_bytes()).await?;

    // Set TTL if specified
    if let Some(ttl) = set_req.ttl {
        redis::execute(
            &redis_address,
            "EXPIRE",
            &[set_req.key.as_bytes(), ttl.to_string().as_bytes()],
        )
        .await?;
    }

    println!(
        "[Redis Cache] SET: {} (TTL: {:?}s)",
        set_req.key, set_req.ttl
    );

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "success",
                "key": set_req.key,
                "ttl": set_req.ttl
            })
            .to_string(),
        )
        .build())
}

/// Get cache value
async fn handle_get(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let key = params.get("key").unwrap_or("default");
    let redis_address = variables::get("redis_address")?;

    let value = redis::get(&redis_address, key).await;

    let response = match value {
        Ok(data) => {
            let value_str = String::from_utf8_lossy(&data).to_string();
            println!("[Redis Cache] GET: {} = {}", key, value_str);
            CacheGetResponse {
                key: key.to_string(),
                value: Some(value_str),
                found: true,
            }
        }
        Err(_) => {
            println!("[Redis Cache] GET: {} = NOT FOUND", key);
            CacheGetResponse {
                key: key.to_string(),
                value: None,
                found: false,
            }
        }
    };

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(serde_json::to_string(&response)?)
        .build())
}

/// Delete cache key
async fn handle_delete(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let key = params.get("key").unwrap_or("default");
    let redis_address = variables::get("redis_address")?;

    redis::execute(&redis_address, "DEL", &[key.as_bytes()]).await?;

    println!("[Redis Cache] DELETE: {}", key);

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "deleted",
                "key": key
            })
            .to_string(),
        )
        .build())
}

/// Increment counter
async fn handle_increment(_req: Request, params: Params) -> Result<impl IntoResponse> {
    let key = params.get("key").unwrap_or("counter");
    let redis_address = variables::get("redis_address")?;

    let result = redis::execute(&redis_address, "INCR", &[key.as_bytes()]).await?;

    let new_value = if !result.is_empty() {
        String::from_utf8_lossy(&result[0])
            .parse::<i64>()
            .unwrap_or(0)
    } else {
        0
    };

    println!("[Redis Cache] INCR: {} = {}", key, new_value);

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "status": "incremented",
                "key": key,
                "value": new_value
            })
            .to_string(),
        )
        .build())
}

/// Get all keys matching pattern
async fn handle_keys(req: Request, _params: Params) -> Result<impl IntoResponse> {
    let redis_address = variables::get("redis_address")?;
    let pattern = req.query().get("pattern").unwrap_or("*");

    let keys_result = redis::execute(&redis_address, "KEYS", &[pattern.as_bytes()]).await?;

    let keys: Vec<String> = keys_result
        .iter()
        .map(|k| String::from_utf8_lossy(k).to_string())
        .collect();

    println!("[Redis Cache] KEYS: {} found {} keys", pattern, keys.len());

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "pattern": pattern,
                "keys": keys,
                "count": keys.len()
            })
            .to_string(),
        )
        .build())
}

/// Get Redis stats
async fn handle_stats(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    let redis_address = variables::get("redis_address")?;

    // Get INFO command output
    let info_result = redis::execute(&redis_address, "INFO", &[b"stats"]).await?;

    let info_str = if !info_result.is_empty() {
        String::from_utf8_lossy(&info_result[0]).to_string()
    } else {
        "No stats available".to_string()
    };

    // Get DB size
    let dbsize_result = redis::execute(&redis_address, "DBSIZE", &[]).await?;
    let dbsize = if !dbsize_result.is_empty() {
        String::from_utf8_lossy(&dbsize_result[0])
            .parse::<i64>()
            .unwrap_or(0)
    } else {
        0
    };

    Ok(ResponseBuilder::new(200)
        .header("content-type", "application/json")
        .body(
            serde_json::json!({
                "dbsize": dbsize,
                "info": info_str,
                "address": redis_address
            })
            .to_string(),
        )
        .build())
}

/// Health check
fn handle_health(_req: Request, _params: Params) -> Result<impl IntoResponse> {
    Ok(Response::new(
        200,
        serde_json::json!({
            "status": "healthy",
            "service": "redis-cache"
        })
        .to_string(),
    ))
}
