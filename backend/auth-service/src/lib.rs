#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    // spin_sdk::http_component macro generates Vec::from_raw_parts with same len/capacity
    clippy::same_length_and_capacity
)]

use http::StatusCode;
use spin_sdk::{
    http::{Method, Request, Response},
    http_component,
};

mod config;
mod handlers;
mod providers;

use config::load_config;
use handlers::{
    callback_handler, login_handler, logout_handler, refresh_handler, well_known_handler,
};

#[http_component]
async fn handle_auth_service(req: Request) -> anyhow::Result<Response> {
    let config = load_config().await?;

    match (req.method(), req.uri()) {
        (&Method::Get, "/api/auth/login") => login_handler(req, &config).await,
        (&Method::Get, "/api/auth/callback") => callback_handler(req, &config).await,
        (&Method::Get, "/api/auth/logout") => logout_handler(req, &config).await,
        (&Method::Post, "/api/auth/refresh") => refresh_handler(req, &config).await,
        (&Method::Get, "/api/auth/.well-known/openid-configuration") => {
            well_known_handler(req, &config).await
        }
        _ => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("Not Found")
            .build()),
    }
}
