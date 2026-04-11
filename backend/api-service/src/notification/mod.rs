use worker::*;

pub async fn handle_send(mut req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;

    let recipient = body["recipient"].as_str().unwrap_or("");
    let subject = body["subject"].as_str().unwrap_or("Notification");
    let content = body["content"].as_str().unwrap_or("");
    let channel = body["channel"].as_str().unwrap_or("email");

    let result = match channel {
        "telegram" => send_telegram(&ctx, recipient, content).await,
        _ => {
            // Default: queue for async processing
            if let Ok(queue) = ctx.env.queue("BOOKING_EVENTS") {
                let _ = queue
                    .send(
                        serde_json::json!({
                            "type": "notification_requested",
                            "channel": channel,
                            "recipient": recipient,
                            "subject": subject,
                            "content": content
                        })
                        .to_string(),
                    )
                    .await;
            }
            Ok(serde_json::json!({"status": "queued", "channel": channel}))
        }
    };

    match result {
        Ok(data) => Response::from_json(&data),
        Err(e) => Response::from_json(&serde_json::json!({
            "status": "failed",
            "error": e.to_string()
        })),
    }
}

pub async fn handle_booking_confirmation(
    mut req: Request,
    ctx: RouteContext<()>,
) -> Result<Response> {
    let body: serde_json::Value = req.json().await?;
    let email = body["email"].as_str().unwrap_or("");
    let details = body["details"].as_str().unwrap_or("");

    // Queue the confirmation for async processing
    if let Ok(queue) = ctx.env.queue("BOOKING_EVENTS") {
        let _ = queue
            .send(
                serde_json::json!({
                    "type": "booking_confirmed",
                    "email": email,
                    "details": details
                })
                .to_string(),
            )
            .await;
    }

    Response::from_json(&serde_json::json!({
        "status": "queued",
        "message": format!("Confirmation queued for {email}")
    }))
}

async fn send_telegram(
    ctx: &RouteContext<()>,
    chat_id: &str,
    text: &str,
) -> std::result::Result<serde_json::Value, worker::Error> {
    let token = ctx.secret("TELEGRAM_BOT_TOKEN")?.to_string();
    let url = format!("https://api.telegram.org/bot{token}/sendMessage");

    let headers = Headers::new();
    headers.set("Content-Type", "application/json")?;

    let body = serde_json::json!({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    });

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(worker::wasm_bindgen::JsValue::from_str(&body.to_string())));

    let req = Request::new_with_init(&url, &init)?;
    let mut resp = Fetch::Request(req).send().await?;
    let data: serde_json::Value = resp.json().await?;

    Ok(serde_json::json!({
        "status": "sent",
        "channel": "telegram",
        "response": data
    }))
}
