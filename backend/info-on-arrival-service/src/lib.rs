#![allow(unused)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::same_length_and_capacity)]

use std::collections::HashMap;
use worker::{event, Context, Env, Method, Request, Response, Result};

mod adapters;
mod application;
mod domain;
mod infrastructure;
mod ports;

use adapters::scraper::MeridaScraperAdapter;
use adapters::storage::PostgresCardsRepository;
use application::CardsServiceImpl;

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    let repo = Box::new(PostgresCardsRepository::new());
    let scraper = Box::new(MeridaScraperAdapter::new());
    let service = CardsServiceImpl::new(repo, scraper);

    let uri = req.path();

    let query_string = uri.split_once('?').map_or("", |(_, q)| q);
    let params: HashMap<String, String> =
        serde_urlencoded::from_str(query_string).unwrap_or_default();

    let path = uri.split_once('?').map_or(uri.as_str(), |(p, _)| p);

    match (req.method(), path) {
        (Method::Get, "/api/info/merida-attractions" | "/merida-attractions") => {
            let res = service
                .get_merida_attractions()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/carrascalejo-info") => {
            let res = service
                .get_carrascalejo_info()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/emergency-contacts") => {
            let res = service
                .get_emergency_contacts()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/route-map") => {
            let stage = params
                .get("stage")
                .map_or("almendralejo", |s: &String| s.as_str());
            let res = service
                .get_route_map(stage)
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/all-cards") => {
            let res = service
                .get_all_info_cards()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/restaurants") => {
            let res = service
                .get_restaurants_eat()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/taxis") => {
            let res = service
                .get_taxi_services()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        (Method::Get, "/api/info/car-rentals") => {
            let res = service
                .get_car_rentals()
                .await
                .map_err(|e| worker::Error::RustError(e.to_string()))?;
            Response::ok(res)
        }
        _ => Response::error("Not Found", 404),
    }
}
