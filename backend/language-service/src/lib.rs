use worker::prelude::*;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Language {
    pub code: String,
    pub name: String,
    pub native_name: String,
    pub flag: String,
    pub is_active: bool,
    pub display_order: i32,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct TranslateRequest {
    pub text: String,
    pub target_locale: String,
    pub source_locale: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct TranslateResponse {
    pub translated_text: String,
    pub detected_language: Option<String>,
}

#[event(start)]
pub fn start() {
    console_error_panic_hook();
}

fn handler(req: Request, _ctx: RouteContext<()>) -> Result<Response> {
    let path = req.path();

    match (req.method(), path) {
        (Method::Get, "/") => Response::ok("language-service running"),
        (Method::Get, "/api/languages") => handle_get_languages(),
        (Method::Post, "/api/languages") => handle_create_language(req),
        (Method::Post, "/api/translate") => handle_translate(req),
        _ => Response::error("Not Found", 404),
    }
}

fn handle_get_languages() -> Result<Response> {
    let languages = get_initial_languages();
    Response::from_json(&languages)
}

fn handle_create_language(req: Request) -> Result<Response> {
    let body = req.text()?;
    let _language: Language =
        serde_json::from_str(&body).map_err(|e| anyhow::anyhow!("Invalid JSON: {}", e))?;

    Response::from_json(&serde_json::json!({"success": true}))?
        .with_status(worker::http::StatusCode::CREATED)
}

fn handle_translate(req: Request) -> Result<Response> {
    let body = req.text()?;
    let request: TranslateRequest =
        serde_json::from_str(&body).map_err(|e| anyhow::anyhow!("Invalid JSON: {}", e))?;

    let source = request.source_locale.as_deref().unwrap_or("es");
    let translated = translate_with_ai(&request.text, &request.target_locale, source);

    let response = TranslateResponse {
        translated_text: translated,
        detected_language: None,
    };

    Response::from_json(&response)
}

fn get_initial_languages() -> Vec<Language> {
    vec![
        Language {
            code: "es".into(),
            name: "Spanish".into(),
            native_name: "Español".into(),
            flag: "🇪🇸".into(),
            is_active: true,
            display_order: 1,
        },
        Language {
            code: "en".into(),
            name: "English".into(),
            native_name: "English".into(),
            flag: "🇬🇧".into(),
            is_active: true,
            display_order: 2,
        },
        Language {
            code: "zh".into(),
            name: "Chinese".into(),
            native_name: "中文".into(),
            flag: "🇨🇳".into(),
            is_active: true,
            display_order: 3,
        },
        Language {
            code: "hi".into(),
            name: "Hindi".into(),
            native_name: "हिन्दी".into(),
            flag: "🇮🇳".into(),
            is_active: true,
            display_order: 4,
        },
        Language {
            code: "ar".into(),
            name: "Arabic".into(),
            native_name: "العربية".into(),
            flag: "🇸🇦".into(),
            is_active: true,
            display_order: 5,
        },
        Language {
            code: "pt".into(),
            name: "Portuguese".into(),
            native_name: "Português".into(),
            flag: "🇵🇹".into(),
            is_active: true,
            display_order: 6,
        },
        Language {
            code: "ru".into(),
            name: "Russian".into(),
            native_name: "Русский".into(),
            flag: "🇷🇺".into(),
            is_active: true,
            display_order: 7,
        },
        Language {
            code: "ja".into(),
            name: "Japanese".into(),
            native_name: "日本語".into(),
            flag: "🇯🇵".into(),
            is_active: true,
            display_order: 8,
        },
        Language {
            code: "de".into(),
            name: "German".into(),
            native_name: "Deutsch".into(),
            flag: "🇩🇪".into(),
            is_active: true,
            display_order: 9,
        },
        Language {
            code: "fr".into(),
            name: "French".into(),
            native_name: "Français".into(),
            flag: "🇫🇷".into(),
            is_active: true,
            display_order: 10,
        },
        Language {
            code: "it".into(),
            name: "Italian".into(),
            native_name: "Italiano".into(),
            flag: "🇮🇹".into(),
            is_active: true,
            display_order: 11,
        },
        Language {
            code: "ko".into(),
            name: "Korean".into(),
            native_name: "한국어".into(),
            flag: "🇰🇷".into(),
            is_active: true,
            display_order: 12,
        },
        Language {
            code: "id".into(),
            name: "Indonesian".into(),
            native_name: "Bahasa Indonesia".into(),
            flag: "🇮🇩".into(),
            is_active: true,
            display_order: 13,
        },
        Language {
            code: "tr".into(),
            name: "Turkish".into(),
            native_name: "Türkçe".into(),
            flag: "🇹🇷".into(),
            is_active: true,
            display_order: 14,
        },
        Language {
            code: "vi".into(),
            name: "Vietnamese".into(),
            native_name: "Tiếng Việt".into(),
            flag: "🇻🇳".into(),
            is_active: true,
            display_order: 15,
        },
        Language {
            code: "ca".into(),
            name: "Catalan".into(),
            native_name: "Català".into(),
            flag: "🏴".into(),
            is_active: true,
            display_order: 16,
        },
        Language {
            code: "eu".into(),
            name: "Basque".into(),
            native_name: "Euskara".into(),
            flag: "🏴".into(),
            is_active: true,
            display_order: 17,
        },
        Language {
            code: "gl".into(),
            name: "Galician".into(),
            native_name: "Galego".into(),
            flag: "🏴".into(),
            is_active: true,
            display_order: 18,
        },
        Language {
            code: "ast".into(),
            name: "Asturian".into(),
            native_name: "Asturianu".into(),
            flag: "🏴󠁥󠁳󠁡󠁳󠁿".into(),
            is_active: true,
            display_order: 19,
        },
    ]
}

fn translate_with_ai(text: &str, target: &str, _source: &str) -> String {
    format!("[{} translation of: {}]", target.to_uppercase(), text)
}
