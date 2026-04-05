use worker::*;

pub async fn get_reviews(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let source = ctx.param("source").unwrap_or(&"all".to_string()).clone();

    let db = ctx.env.d1("DB")?;
    let query = match source.as_str() {
        "google" => "SELECT * FROM reviews WHERE source = 'google' ORDER BY created_at DESC",
        "booking" => "SELECT * FROM reviews WHERE source = 'booking' ORDER BY created_at DESC",
        _ => "SELECT * FROM reviews ORDER BY created_at DESC",
    };

    let results = db.prepare(query).all().await?;
    Response::from_json(&results.results::<serde_json::Value>()?)
}

pub async fn get_stats(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let db = ctx.env.d1("DB")?;

    let stats = db
        .prepare(
            "SELECT source, COUNT(*) as count, AVG(rating) as avg_rating FROM reviews GROUP BY source",
        )
        .all()
        .await?;

    Response::from_json(&stats.results::<serde_json::Value>()?)
}
