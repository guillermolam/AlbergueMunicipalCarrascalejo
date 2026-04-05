use worker::*;

mod auth;
mod booking;
mod document_validation;
mod info;
mod location;
mod notification;
mod rate_limiter;
mod reviews;
mod security;
mod shared;

fn cors_headers(mut resp: Response) -> Result<Response> {
    let headers = resp.headers_mut();
    headers.set("Access-Control-Allow-Origin", "*")?;
    headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
    )?;
    headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key",
    )?;
    headers.set(
        "Access-Control-Expose-Headers",
        "X-RateLimit-Remaining, X-RateLimit-Reset",
    )?;
    Ok(resp)
}

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    // Handle CORS preflight
    if req.method() == Method::Options {
        return cors_headers(Response::ok("")?);
    }

    let router = Router::new();

    let response = router
        // Health
        .get("/api/health", |_, _| {
            Response::from_json(&serde_json::json!({
                "status": "healthy",
                "service": "albergue-api",
                "version": env!("CARGO_PKG_VERSION"),
                "platform": "cloudflare-workers"
            }))
        })
        // Auth
        .get_async("/api/auth/login", auth::handle_login)
        .get_async("/api/auth/callback", auth::handle_callback)
        .get_async("/api/auth/logout", auth::handle_logout)
        .post_async("/api/auth/refresh", auth::handle_refresh)
        // Booking
        .get_async("/api/bookings", booking::get_bookings)
        .post_async("/api/bookings", booking::create_booking)
        .get_async("/api/rooms", booking::get_rooms)
        .get_async("/api/dashboard/stats", booking::get_dashboard_stats)
        .get_async("/api/pricing", booking::get_pricing)
        // Reviews
        .get_async("/api/reviews/:source", reviews::get_reviews)
        .get_async("/api/reviews/stats", reviews::get_stats)
        // Security
        .post("/api/security/scan", security::handle_scan)
        .post("/api/security/encrypt", security::handle_encrypt)
        .post("/api/security/validate", security::handle_validate)
        .get("/api/security/status", security::handle_status)
        // Rate Limiter
        .post_async("/api/rate-limit/check", rate_limiter::handle_check)
        .get_async("/api/rate-limit/status", rate_limiter::handle_status)
        .post_async("/api/rate-limit/reset", rate_limiter::handle_reset)
        // Document Validation
        .post("/api/validate/document", document_validation::handle_document)
        .post("/api/validate/dni", document_validation::handle_dni)
        .post("/api/validate/nie", document_validation::handle_nie)
        .post("/api/validate/passport", document_validation::handle_passport)
        // Notification
        .post_async("/api/notifications/send", notification::handle_send)
        .post_async(
            "/api/notifications/booking-confirmation",
            notification::handle_booking_confirmation,
        )
        // Location
        .get_async("/api/countries/:code", location::get_country)
        .get_async("/api/countries", location::list_countries)
        .get_async("/api/location/search", location::search_locations)
        // Info on Arrival
        .get_async("/api/info/:category", info::handle_info)
        .run(req, env)
        .await?;

    cors_headers(response)
}

#[event(queue)]
async fn queue(batch: MessageBatch<String>, env: Env, _ctx: Context) -> Result<()> {
    for message in batch.messages()? {
        let event: serde_json::Value =
            serde_json::from_str(message.body()).unwrap_or(serde_json::json!({}));

        let event_type = event["type"].as_str().unwrap_or("unknown");
        console_log!("Processing event: {}", event_type);

        match event_type {
            "booking_created" | "booking_confirmed" => {
                // Trigger notification
                if let Some(email) = event["email"].as_str() {
                    console_log!("Sending confirmation to: {}", email);
                }
            }
            "payment_received" => {
                console_log!("Payment processed");
            }
            _ => {
                console_log!("Unknown event type: {}", event_type);
            }
        }

        message.ack();
    }

    Ok(())
}
