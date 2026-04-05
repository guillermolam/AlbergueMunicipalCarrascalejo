#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::same_length_and_capacity,
    clippy::unused_async,
    clippy::struct_field_names,
    clippy::upper_case_acronyms,
    clippy::unnecessary_wraps,
    clippy::needless_continue,
    clippy::missing_errors_doc,
    clippy::missing_panics_doc,
    clippy::must_use_candidate,
    clippy::return_self_not_must_use,
    clippy::new_without_default,
    clippy::used_underscore_binding
)]

use std::collections::HashMap;
use worker::{event, Context, Env, Method, Request, Response, Result};

mod adapters;
pub mod application;
pub mod domain;
mod infrastructure;
mod ports;

use application::notification_service::NotificationService;
use domain::notification::{
    Notification, NotificationChannel, NotificationStatus, NotificationType,
};

#[event(fetch)]
async fn fetch(mut req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let service = NotificationService::new();
    let method = req.method();
    let path = req.path();

    match (method, path.as_str()) {
        (Method::Post, "/send/email") => handle_send_email(&mut req, &service).await,
        (Method::Post, "/send/booking-confirmation") => {
            handle_booking_confirmation(&mut req, &service).await
        }
        _ => Response::error("Not Found", 404),
    }
}

#[derive(serde::Deserialize)]
struct SendRequest {
    recipient: String,
    subject: Option<String>,
    content: String,
}

async fn handle_send_email(req: &mut Request, service: &NotificationService) -> Result<Response> {
    let body = req.text().await?;
    let payload: SendRequest =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let notification = Notification {
        id: uuid::Uuid::new_v4(),
        notification_type: NotificationType::AdminAlert,
        recipient: payload.recipient,
        subject: payload.subject,
        message: payload.content,
        channel: NotificationChannel::Email,
        status: NotificationStatus::Pending,
        created_at: chrono::Utc::now(),
        sent_at: None,
        delivered_at: None,
        error_message: None,
        template_data: HashMap::new(),
    };

    let result = service
        .send_with_fallback(notification, vec![NotificationChannel::Email])
        .await
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    Response::from_json(&result)
}

#[derive(serde::Deserialize)]
struct BookingConfirmationRequest {
    email: String,
    details: String,
}

async fn handle_booking_confirmation(
    req: &mut Request,
    service: &NotificationService,
) -> Result<Response> {
    let body = req.text().await?;
    let payload: BookingConfirmationRequest =
        serde_json::from_str(&body).map_err(|e| worker::Error::RustError(e.to_string()))?;

    let results = service
        .send_booking_confirmation(&payload.email, None, &payload.details)
        .await
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    Response::from_json(&results)
}
