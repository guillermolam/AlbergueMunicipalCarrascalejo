#![warn(clippy::all, clippy::pedantic)]
#![allow(
    clippy::module_name_repetitions,
    clippy::same_length_and_capacity,
    clippy::unused_async,
    clippy::struct_field_names,
    clippy::upper_case_acronyms,
    clippy::unnecessary_wraps,
    clippy::needless_continue,
)]

use http::StatusCode;
use spin_sdk::{
    http::{Method, Request, Response},
    http_component,
};
use std::collections::HashMap;

mod adapters;
mod application;
mod domain;
mod infrastructure;
mod ports;

use application::notification_service::NotificationService;
use domain::notification::{
    Notification, NotificationChannel, NotificationStatus, NotificationType,
};

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<Response> {
    let service = NotificationService::new();
    let method = req.method();
    let path = req.uri();

    match (method, path) {
        (&Method::Post, "/send/email") => handle_send_email(req, &service).await,
        (&Method::Post, "/send/booking-confirmation") => {
            handle_booking_confirmation(req, &service).await
        }
        _ => Ok(Response::new(StatusCode::NOT_FOUND, "Not Found")),
    }
}

#[derive(serde::Deserialize)]
struct SendRequest {
    recipient: String,
    subject: Option<String>,
    content: String,
}

async fn handle_send_email(
    req: Request,
    service: &NotificationService,
) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: SendRequest = serde_json::from_slice(&body)?;

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
        .await?;

    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&result)?))
}

#[derive(serde::Deserialize)]
struct BookingConfirmationRequest {
    email: String,
    details: String,
}

async fn handle_booking_confirmation(
    req: Request,
    service: &NotificationService,
) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: BookingConfirmationRequest = serde_json::from_slice(&body)?;

    let results = service
        .send_booking_confirmation(&payload.email, None, &payload.details)
        .await?;

    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&results)?))
}
