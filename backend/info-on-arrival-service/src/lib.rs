#![allow(unused)]
#![warn(clippy::all, clippy::pedantic)]
#![allow(clippy::same_length_and_capacity)]

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

use adapters::scraper::MeridaScraperAdapter;
use adapters::storage::PostgresCardsRepository;
use application::CardsServiceImpl;

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<Response> {
    let repo = Box::new(PostgresCardsRepository::new());
    let scraper = Box::new(MeridaScraperAdapter::new());
    let service = CardsServiceImpl::new(repo, scraper);

    let uri = req.uri();

    let query_string = uri.split_once('?').map_or("", |(_, q)| q);
    let params: HashMap<String, String> =
        serde_urlencoded::from_str(query_string).unwrap_or_default();

    let path = uri.split_once('?').map_or(uri, |(p, _)| p);

    match (req.method(), path) {
        (&Method::Get, "/api/info/merida-attractions" | "/merida-attractions") => {
            let res = service.get_merida_attractions().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/carrascalejo-info") => {
            let res = service.get_carrascalejo_info().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/emergency-contacts") => {
            let res = service.get_emergency_contacts().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/route-map") => {
            let stage = params
                .get("stage")
                .map_or("almendralejo", |s: &String| s.as_str());
            let res = service.get_route_map(stage).await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/all-cards") => {
            let res = service.get_all_info_cards().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/restaurants") => {
            let res = service.get_restaurants_eat().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/taxis") => {
            let res = service.get_taxi_services().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        (&Method::Get, "/api/info/car-rentals") => {
            let res = service.get_car_rentals().await?;
            Ok(Response::new(StatusCode::OK, res))
        }
        _ => Ok(Response::new(StatusCode::NOT_FOUND, "Not Found")),
    }
}
