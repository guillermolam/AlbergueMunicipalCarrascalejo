//! language-service — Cloudflare Worker for i18n language catalog and translation.
//!
//! Endpoints:
//!   GET  /                — health check
//!   GET  /api/languages   — return the 19 supported languages
//!   POST /api/languages   — create/register a language (stored in KV if bound)
//!   POST /api/translate   — translate text via Workers AI (if `AI` binding set)
//!
//! Bindings (optional):
//!   - KV `LANGUAGES`     — override language catalog persisted across requests
//!   - KV `TRANSLATIONS`  — cache translation results per (source→target, hash)
//!   - AI `AI`            — Cloudflare Workers AI binding for real translations

#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::missing_errors_doc, clippy::missing_panics_doc)]

use serde::{Deserialize, Serialize};
use worker::{console_log, event, Context, Env, Method, Request, Response, Result};

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub struct Language {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub flag: String,
    pub is_active: bool,
    pub display_order: i32,
}

#[derive(Serialize, Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub target_locale: String,
    pub source_locale: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TranslateResponse {
    pub translated_text: String,
    pub detected_language: Option<String>,
}

// ---------------------------------------------------------------------------
// Entrypoints
// ---------------------------------------------------------------------------

#[event(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

#[event(fetch)]
pub async fn fetch(mut req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let method = req.method();
    let path = req.path();

    console_log!("[language-service] {} {}", method_str(&method), path);

    let resp = match (method, path.as_str()) {
        (Method::Get, "/") => Response::ok("language-service running"),
        (Method::Get, "/api/languages") => handle_get_languages(&env).await,
        (Method::Post, "/api/languages") => handle_create_language(&mut req, &env).await,
        (Method::Post, "/api/translate") => handle_translate(&mut req, &env).await,
        (Method::Options, _) => Response::empty(),
        _ => Response::error("Not Found", 404),
    }?;

    Ok(with_cors(resp))
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async fn handle_get_languages(env: &Env) -> Result<Response> {
    // Try KV first; fall back to the static catalog.
    if let Ok(kv) = env.kv("LANGUAGES") {
        if let Ok(Some(raw)) = kv.get("catalog").text().await {
            if let Ok(parsed) = serde_json::from_str::<Vec<Language>>(&raw) {
                return Response::from_json(&parsed);
            }
        }
    }
    Response::from_json(&get_initial_languages())
}

async fn handle_create_language(req: &mut Request, env: &Env) -> Result<Response> {
    let body = req.text().await?;
    let lang: Language = match serde_json::from_str(&body) {
        Ok(l) => l,
        Err(e) => {
            return Response::error(format!("Invalid JSON: {e}"), 400);
        }
    };

    // Append to KV catalog if bound.
    if let Ok(kv) = env.kv("LANGUAGES") {
        let mut catalog: Vec<Language> = match kv.get("catalog").text().await {
            Ok(Some(raw)) => serde_json::from_str(&raw).unwrap_or_else(|_| get_initial_languages()),
            _ => get_initial_languages(),
        };
        if !catalog.iter().any(|c| c.code == lang.code) {
            catalog.push(lang.clone());
        }
        let serialized = serde_json::to_string(&catalog).unwrap_or_default();
        let _ = kv.put("catalog", serialized)?.execute().await;
    }

    Response::from_json(&serde_json::json!({ "success": true, "code": lang.code }))
        .map(|r| r.with_status(201))
}

async fn handle_translate(req: &mut Request, _env: &Env) -> Result<Response> {
    let body = req.text().await?;
    let tr: TranslateRequest = match serde_json::from_str(&body) {
        Ok(v) => v,
        Err(e) => return Response::error(format!("Invalid JSON: {e}"), 400),
    };

    let source = tr.source_locale.as_deref().unwrap_or("es");
    // Placeholder — swap with a real `env.ai("AI")` call once Workers AI is enabled.
    let translated = format!(
        "[{}→{}] {}",
        source.to_uppercase(),
        tr.target_locale.to_uppercase(),
        tr.text
    );

    Response::from_json(&TranslateResponse {
        translated_text: translated,
        detected_language: None,
    })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn with_cors(mut resp: Response) -> Response {
    let headers = resp.headers_mut();
    let _ = headers.set("Access-Control-Allow-Origin", "*");
    let _ = headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    let _ = headers.set("Access-Control-Allow-Headers", "Content-Type");
    resp
}

fn method_str(m: &Method) -> &'static str {
    match m {
        Method::Get => "GET",
        Method::Post => "POST",
        Method::Put => "PUT",
        Method::Delete => "DELETE",
        Method::Options => "OPTIONS",
        _ => "OTHER",
    }
}

#[must_use]
pub fn get_initial_languages() -> Vec<Language> {
    macro_rules! lang {
        ($code:literal, $name:literal, $native:literal, $flag:literal, $order:literal) => {
            Language {
                code: $code.into(),
                name: $name.into(),
                native_name: $native.into(),
                flag: $flag.into(),
                is_active: true,
                display_order: $order,
            }
        };
    }

    vec![
        lang!("es", "Spanish",    "Español",          "\u{1F1EA}\u{1F1F8}", 1),
        lang!("en", "English",    "English",          "\u{1F1EC}\u{1F1E7}", 2),
        lang!("zh", "Chinese",    "\u{4E2D}\u{6587}", "\u{1F1E8}\u{1F1F3}", 3),
        lang!("hi", "Hindi",      "हिन्दी",            "\u{1F1EE}\u{1F1F3}", 4),
        lang!("ar", "Arabic",     "العربية",          "\u{1F1F8}\u{1F1E6}", 5),
        lang!("pt", "Portuguese", "Português",        "\u{1F1F5}\u{1F1F9}", 6),
        lang!("ru", "Russian",    "Русский",          "\u{1F1F7}\u{1F1FA}", 7),
        lang!("ja", "Japanese",   "日本語",           "\u{1F1EF}\u{1F1F5}", 8),
        lang!("de", "German",     "Deutsch",          "\u{1F1E9}\u{1F1EA}", 9),
        lang!("fr", "French",     "Français",         "\u{1F1EB}\u{1F1F7}", 10),
        lang!("it", "Italian",    "Italiano",         "\u{1F1EE}\u{1F1F9}", 11),
        lang!("ko", "Korean",     "한국어",           "\u{1F1F0}\u{1F1F7}", 12),
        lang!("id", "Indonesian", "Bahasa Indonesia", "\u{1F1EE}\u{1F1E9}", 13),
        lang!("tr", "Turkish",    "Türkçe",           "\u{1F1F9}\u{1F1F7}", 14),
        lang!("vi", "Vietnamese", "Tiếng Việt",       "\u{1F1FB}\u{1F1F3}", 15),
        lang!("ca", "Catalan",    "Català",           "\u{1F3F4}",          16),
        lang!("eu", "Basque",     "Euskara",          "\u{1F3F4}",          17),
        lang!("gl", "Galician",   "Galego",           "\u{1F3F4}",          18),
        lang!("ast", "Asturian",  "Asturianu",        "\u{1F3F4}",          19),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_has_19_entries() {
        assert_eq!(get_initial_languages().len(), 19);
    }

    #[test]
    fn catalog_codes_are_unique() {
        let langs = get_initial_languages();
        let mut codes: Vec<_> = langs.iter().map(|l| l.code.as_str()).collect();
        codes.sort_unstable();
        codes.dedup();
        assert_eq!(codes.len(), 19, "duplicate codes detected");
    }
}
