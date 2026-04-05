#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::same_length_and_capacity,
    clippy::missing_errors_doc
)]

use worker::{event, Context, Env, Method, Request, Response, Result};

pub mod config;
pub mod handlers;
pub mod providers;

use config::load_config;
use handlers::{
    callback_handler, login_handler, logout_handler, refresh_handler, well_known_handler,
};

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let config = load_config()
        .await
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    let method = req.method();
    let path = req.path();

    match (method, path.as_str()) {
        (Method::Get, "/api/auth/login") => login_handler(&req, &config).await,
        (Method::Get, "/api/auth/callback") => callback_handler(&req, &config).await,
        (Method::Get, "/api/auth/logout") => logout_handler(&req, &config).await,
        (Method::Post, "/api/auth/refresh") => refresh_handler(&mut req, &config).await,
        (Method::Get, "/api/auth/.well-known/openid-configuration") => {
            well_known_handler(&req, &config).await
        }
        _ => Response::error("Not Found", 404),
    }
}
