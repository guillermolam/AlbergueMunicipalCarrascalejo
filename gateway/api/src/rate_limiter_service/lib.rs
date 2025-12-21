use anyhow::Result;
use spin_sdk::http::{Request, Response};
use std::collections::HashMap;

pub async fn handle(req: &Request) -> Result<Response> {
    // Mock rate limiting logic
    // In real implementation, this would check against a rate limiting store

    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .or_else(|| req.headers().get("x-real-ip"))
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown");

    // Mock rate limit check - allow first 15 requests, then start limiting
    let request_count = client_ip.len() % 20; // Mock counter based on IP

    if request_count >= 15 {
        let error_body = serde_json::json!({
            "error": "Rate Limit Exceeded",
            "message": "Too many requests",
            "retry_after": 60
        })
        .to_string();

        Ok(Response::builder()
            .status(429)
            .header("Content-Type", "application/json")
            .header("X-RateLimit-Remaining", "0")
            .header("X-RateLimit-Reset", "60")
            .body(error_body)
            .build())
    } else {
        let response_body = serde_json::json!({
            "status": "ok",
            "requests_remaining": 15 - request_count
        })
        .to_string();

        Ok(Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .header("X-RateLimit-Remaining", &(15 - request_count).to_string())
            .body(response_body)
            .build())
    }
}
