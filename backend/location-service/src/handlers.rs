use std::sync::Arc;

use worker::{Env, Fetch, Method, Request, RequestInit, Response, Result, Url};

use crate::models::{AutocompleteSuggestion, CacheConfig, GeoapifyFeatureCollection};
use crate::service::LocationService;
use shared::response::{ApiResponse, Status};

pub struct RequestHandler {
    service: Arc<std::sync::Mutex<LocationService>>,
    env: Option<Env>,
}

impl Default for RequestHandler {
    fn default() -> Self {
        Self::new(None)
    }
}

impl RequestHandler {
    #[must_use]
    pub fn new(env: Option<Env>) -> Self {
        let service = LocationService::with_memory_cache(Some(CacheConfig::default()));
        Self {
            service: Arc::new(std::sync::Mutex::new(service)),
            env,
        }
    }

    #[cfg(test)]
    pub const fn with_service(service: Arc<std::sync::Mutex<LocationService>>) -> Self {
        Self { service, env: None }
    }

    pub async fn handle_request(&self, req: Request) -> Result<Response> {
        let request_path = req.path();
        let path = request_path.split('?').next().unwrap_or("");

        match (req.method(), path) {
            (Method::Options, _) => Response::ok("").and_then(|mut resp| {
                let headers = resp.headers_mut();
                headers.set("Access-Control-Allow-Origin", "*")?;
                headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")?;
                headers.set("Access-Control-Allow-Headers", "Content-Type")?;
                Ok(resp)
            }),
            // ── Address autocomplete (Geoapify) ───────────────────────────────
            (Method::Get, "/api/autocomplete") => self.autocomplete(&req).await,
            (Method::Get, p) if p.starts_with("/api/countries/") => {
                let code = p.strip_prefix("/api/countries/").unwrap_or("");
                self.get_country(code).await
            }
            (Method::Post, "/api/countries/warm-cache") => self.warm_cache().await,
            (Method::Get, "/api/countries") => self.list_countries(),
            (Method::Delete, "/api/countries/cache") => self.clear_cache().await,
            (Method::Delete, p) if p.starts_with("/api/countries/") => {
                let code = p.strip_prefix("/api/countries/").unwrap_or("");
                self.clear_country(code).await
            }
            _ => self.not_found(),
        }
    }
    /// GET /api/autocomplete?text=<query>[&lang=es][&limit=6][&countrycode=es,fr]
    /// Proxies to Geoapify Address Autocomplete API.  The GEOAPIFY_API_KEY secret
    /// is read from the Worker environment — never exposed to callers.
    async fn autocomplete(&self, req: &Request) -> Result<Response> {
        // Parse query-string parameters from the raw URL
        let raw_url = req.url()?;
        let query: std::collections::HashMap<String, String> = raw_url
            .query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect();

        let text = query.get("text").map_or("", String::as_str).trim();
        if text.len() < 2 {
            return self.json_response(&serde_json::json!({ "suggestions": [] }), Status::OK);
        }

        // Read API key from Worker environment (bound via wrangler.toml / CF secrets).
        let api_key = self
            .env
            .as_ref()
            .and_then(|e| e.var("GEOAPIFY_API_KEY").ok())
            .map(|v| v.to_string())
            .unwrap_or_default();
        if api_key.is_empty() {
            log::error!("GEOAPIFY_API_KEY not configured");
            return self.internal_error("Geocoding service not configured");
        }

        let lang = query.get("lang").map_or("es", String::as_str);
        let limit = query.get("limit").map_or("6", String::as_str);
        let countrycode = query.get("countrycode").cloned().unwrap_or_default();

        let mut geo_url = Url::parse("https://api.geoapify.com/v1/geocode/autocomplete")
            .map_err(|e| worker::Error::RustError(format!("URL parse error: {e}")))?;
        {
            let mut pairs = geo_url.query_pairs_mut();
            pairs.append_pair("text", text);
            pairs.append_pair("apiKey", &api_key);
            pairs.append_pair("lang", lang);
            pairs.append_pair("limit", limit);
            if !countrycode.is_empty() {
                pairs.append_pair("filter", &format!("countrycode:{countrycode}"));
            }
        }

        let geo_req = Request::new_with_init(
            geo_url.as_str(),
            RequestInit::new().with_method(Method::Get),
        )?;

        let mut geo_resp = Fetch::Request(geo_req).send().await?;
        if !geo_resp.status_code().eq(&200) {
            log::error!("Geoapify returned HTTP {}", geo_resp.status_code());
            return self.json_response(&serde_json::json!({ "suggestions": [] }), Status::OK);
        }

        let geo: GeoapifyFeatureCollection = geo_resp.json().await?;

        let suggestions: Vec<AutocompleteSuggestion> = geo
            .features
            .into_iter()
            .map(|f| {
                let p = f.properties;
                let street = {
                    let s = p.street.as_deref().unwrap_or("");
                    let h = p.housenumber.as_deref().unwrap_or("");
                    if s.is_empty() {
                        p.address_line1.clone().unwrap_or_default()
                    } else if h.is_empty() {
                        s.to_string()
                    } else {
                        format!("{s} {h}")
                    }
                };
                AutocompleteSuggestion {
                    label: p
                        .formatted
                        .or(p.address_line1)
                        .unwrap_or_else(|| street.clone()),
                    street,
                    city: p.city.unwrap_or_default(),
                    postcode: p.postcode.unwrap_or_default(),
                    country_code: p.country_code.unwrap_or_default().to_uppercase(),
                }
            })
            .filter(|s| !s.label.is_empty())
            .collect();

        self.json_response(
            &serde_json::json!({ "suggestions": suggestions }),
            Status::OK,
        )
    }

    async fn get_country(&self, code: &str) -> Result<Response> {
        if code.is_empty() {
            return self.bad_request("Country code is required");
        }

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.get_country_data(code).await {
            Ok(Some(country)) => self.json_response(&ApiResponse::success(country), Status::OK),
            Ok(None) => self.not_found_response("Country not found"),
            Err(e) => {
                log::error!("Error getting country data: {e}");
                self.internal_error("Internal server error")
            }
        }
    }

    async fn warm_cache(&self) -> Result<Response> {
        let codes = ["ES", "FR", "PT", "IT", "DE", "GB"];

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.warm_cache(&codes).await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Cache warmed successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to warm cache: {e}");
                self.internal_error("Failed to warm cache")
            }
        }
    }

    fn list_countries(&self) -> Result<Response> {
        self.json_response(
            &ApiResponse::success(["ES", "FR", "DE", "IT", "PT"]),
            Status::OK,
        )
    }

    async fn clear_cache(&self) -> Result<Response> {
        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.clear_cache().await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Cache cleared successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to clear cache: {e}");
                self.internal_error("Failed to clear cache")
            }
        }
    }

    async fn clear_country(&self, code: &str) -> Result<Response> {
        if code.is_empty() {
            return self.bad_request("Country code is required");
        }

        let mut service = self
            .service
            .lock()
            .map_err(|e| worker::Error::RustError(format!("Lock error: {e}")))?;

        match service.clear_country_cache(code).await {
            Ok(()) => self.json_response(
                &ApiResponse::success("Country cache cleared successfully"),
                Status::OK,
            ),
            Err(e) => {
                log::error!("Failed to clear country cache: {e}");
                self.internal_error("Failed to clear country cache")
            }
        }
    }

    fn not_found(&self) -> Result<Response> {
        self.not_found_response("Endpoint not found")
    }

    fn json_response<T: serde::Serialize>(&self, body: &T, status: Status) -> Result<Response> {
        let json = serde_json::to_string(body)
            .map_err(|e| worker::Error::RustError(format!("JSON serialization error: {e}")))?;
        let mut resp = Response::ok(json)?;
        let headers = resp.headers_mut();
        headers.set("Content-Type", "application/json")?;
        headers.set("Access-Control-Allow-Origin", "*")?;
        if status.code() != 200 {
            resp = resp.with_status(status.code());
        }
        Ok(resp)
    }

    fn bad_request(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::BAD_REQUEST,
        )
    }

    fn not_found_response(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::NOT_FOUND,
        )
    }

    fn internal_error(&self, msg: &str) -> Result<Response> {
        self.json_response(
            &ApiResponse::<()>::error(msg.to_string()),
            Status::INTERNAL_SERVER_ERROR,
        )
    }
}
