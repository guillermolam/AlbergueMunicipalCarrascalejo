#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

use std::sync::Arc;

use axum::{
    routing::{get, post},
    Router,
};
use spin_sdk::{
    http::{IntoResponse as _, Request, Response},
    http_component,
};
use tower::util::ServiceExt;

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
    let shared_config = Arc::new(config);

    let app = Router::new()
        .route("/login", get(login_handler))
        .route("/callback", get(callback_handler))
        .route("/logout", get(logout_handler))
        .route("/refresh", post(refresh_handler))
        .route("/.well-known/openid-configuration", get(well_known_handler))
        .with_state(shared_config);

    Ok(app.oneshot(req).await.into_response())
}
