#![deny(warnings)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::module_name_repetitions)]

use spin_sdk::{
    http::{Request, Response, Method},
    http_component,
};
use http::StatusCode;
use std::collections::HashMap;

mod adapters;
mod application;
mod domain;
mod infrastructure;
mod ports;

use application::notification_service::NotificationService;
use domain::notification::{Notification, NotificationChannel, NotificationStatus};

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<Response> {
    let service = NotificationService::new();
    let method = req.method();
    let path = req.uri();

    match (method, path) {
        (&Method::Post, "/send/email") => handle_send_email(req, &service).await,
        (&Method::Post, "/send/sms") => handle_send_sms(req, &service).await,
        (&Method::Post, "/send/whatsapp") => handle_send_whatsapp(req, &service).await,
        (&Method::Post, "/send/telegram") => handle_send_telegram(req, &service).await,
        (&Method::Post, "/send/booking-confirmation") => handle_booking_confirmation(req, &service).await,
        _ => Ok(Response::new(StatusCode::NOT_FOUND, "Not Found"))
    }
}

#[derive(serde::Deserialize)]
struct SendRequest {
    recipient: String,
    subject: Option<String>,
    content: String, // or message or body
}

async fn handle_send_email(req: Request, service: &NotificationService) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: SendRequest = serde_json::from_slice(&body)?;
    
    let notification = Notification {
        id: uuid::Uuid::new_v4().to_string(),
        recipient: payload.recipient,
        subject: payload.subject.unwrap_or_default(),
        body: payload.content,
        channel: None,
        status: NotificationStatus::Pending,
        created_at: chrono::Utc::now(),
        sent_at: None,
    };

    let result = service.send_with_fallback(notification, vec![NotificationChannel::Email]).await?;
    
    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&result)?))
}

async fn handle_send_sms(req: Request, service: &NotificationService) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: SendRequest = serde_json::from_slice(&body)?;
    
    let notification = Notification {
        id: uuid::Uuid::new_v4().to_string(),
        recipient: payload.recipient,
        subject: "".to_string(),
        body: payload.content,
        channel: None,
        status: NotificationStatus::Pending,
        created_at: chrono::Utc::now(),
        sent_at: None,
    };

    let result = service.send_with_fallback(notification, vec![NotificationChannel::Sms]).await?;
    
    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&result)?))
}

async fn handle_send_whatsapp(req: Request, service: &NotificationService) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: SendRequest = serde_json::from_slice(&body)?;
    
    let notification = Notification {
        id: uuid::Uuid::new_v4().to_string(),
        recipient: payload.recipient,
        subject: "".to_string(),
        body: payload.content,
        channel: None,
        status: NotificationStatus::Pending,
        created_at: chrono::Utc::now(),
        sent_at: None,
    };

    let result = service.send_with_fallback(notification, vec![NotificationChannel::WhatsApp]).await?;
    
    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&result)?))
}

async fn handle_send_telegram(req: Request, service: &NotificationService) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: SendRequest = serde_json::from_slice(&body)?;
    
    let notification = Notification {
        id: uuid::Uuid::new_v4().to_string(),
        recipient: payload.recipient,
        subject: "".to_string(),
        body: payload.content,
        channel: None,
        status: NotificationStatus::Pending,
        created_at: chrono::Utc::now(),
        sent_at: None,
    };

    let result = service.send_with_fallback(notification, vec![NotificationChannel::Telegram]).await?;
    
    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&result)?))
}

#[derive(serde::Deserialize)]
struct BookingConfirmationRequest {
    email: String,
    phone: Option<String>,
    details: String,
}

async fn handle_booking_confirmation(req: Request, service: &NotificationService) -> anyhow::Result<Response> {
    let body = req.into_body();
    let payload: BookingConfirmationRequest = serde_json::from_slice(&body)?;
    
    let results = service.send_booking_confirmation(&payload.email, payload.phone.as_deref(), &payload.details).await?;
    
    Ok(Response::new(StatusCode::OK, serde_json::to_vec(&results)?))
}
