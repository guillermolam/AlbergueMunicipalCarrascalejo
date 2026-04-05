use worker::*;

pub async fn handle_login(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let client_id = ctx.var("GITHUB_CLIENT_ID")?.to_string();
    let redirect_uri = ctx.var("AUTH_REDIRECT_URI")?.to_string();

    let auth_url = format!(
        "https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=user:email"
    );

    Response::redirect_with_status(Url::parse(&auth_url)?, 302)
}

pub async fn handle_callback(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let url = req.url()?;
    let code = url
        .query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string())
        .ok_or_else(|| Error::from("Missing code parameter"))?;

    let client_id = ctx.var("GITHUB_CLIENT_ID")?.to_string();
    let client_secret = ctx.secret("GITHUB_CLIENT_SECRET")?.to_string();

    // Exchange code for token via outbound HTTP
    let mut headers = Headers::new();
    headers.set("Accept", "application/json")?;
    headers.set("Content-Type", "application/json")?;

    let token_body = serde_json::json!({
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code
    });

    let mut init = RequestInit::new();
    init.with_method(Method::Post);
    init.with_headers(headers);
    init.with_body(Some(wasm_bindgen::JsValue::from_str(
        &token_body.to_string(),
    )));

    let token_req = Request::new_with_init(
        "https://github.com/login/oauth/access_token",
        &init,
    )?;

    let mut token_resp = Fetch::Request(token_req).send().await?;
    let token_data: serde_json::Value = token_resp.json().await?;

    let access_token = token_data["access_token"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Store session in KV
    let session_id = uuid::Uuid::new_v4().to_string();
    let kv = ctx.kv("CACHE")?;
    kv.put(&format!("session:{session_id}"), &access_token)?
        .expiration_ttl(3600)
        .execute()
        .await?;

    Response::from_json(&serde_json::json!({
        "session_id": session_id,
        "token_type": "bearer"
    }))
}

pub async fn handle_logout(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    if let Some(session_id) = req
        .headers()
        .get("Authorization")?
        .and_then(|h| h.strip_prefix("Bearer ").map(String::from))
    {
        let kv = ctx.kv("CACHE")?;
        kv.delete(&format!("session:{session_id}")).await?;
    }

    Response::from_json(&serde_json::json!({"status": "logged_out"}))
}

pub async fn handle_refresh(req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let session_id = req
        .headers()
        .get("Authorization")?
        .and_then(|h| h.strip_prefix("Bearer ").map(String::from))
        .ok_or_else(|| Error::from("Missing authorization"))?;

    let kv = ctx.kv("CACHE")?;
    let token = kv
        .get(&format!("session:{session_id}"))
        .text()
        .await?
        .ok_or_else(|| Error::from("Session expired"))?;

    // Extend session TTL
    kv.put(&format!("session:{session_id}"), &token)?
        .expiration_ttl(3600)
        .execute()
        .await?;

    Response::from_json(&serde_json::json!({
        "session_id": session_id,
        "refreshed": true
    }))
}
