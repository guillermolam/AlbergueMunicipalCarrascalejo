#![allow(unused)]
#![warn(clippy::all, clippy::pedantic)]

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

use application::CardsServiceImpl;
use adapters::storage::PostgresCardsRepository;
use adapters::scraper::MeridaScraperAdapter;

#[http_component]
async fn handle_request(req: Request) -> anyhow::Result<Response> {
    let repo = Box::new(PostgresCardsRepository::new());
    let scraper = Box::new(MeridaScraperAdapter::new());
    let service = CardsServiceImpl::new(repo, scraper);

    let uri = req.uri();
    
    let query_string = uri.split_once('?').map(|(_, q)| q).unwrap_or("");
    let params: HashMap<String, String> = serde_urlencoded::from_str(query_string).unwrap_or_default();

    let path = uri.split_once('?').map(|(p, _)| p).unwrap_or(uri);

    match (req.method(), path) {
        (&Method::Get, "/api/info/merida-attractions") => {
            let res = service.get_merida_attractions().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/carrascalejo-info") => {
            let res = service.get_carrascalejo_info().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/emergency-contacts") => {
            let res = service.get_emergency_contacts().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/route-map") => {
            let stage = params.get("stage").map(|s: &String| s.as_str()).unwrap_or("almendralejo");
            let res = service.get_route_map(stage).await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/all-cards") => {
            let res = service.get_all_info_cards().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/restaurants") => {
            let res = service.get_restaurants_eat().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/taxis") => {
            let res = service.get_taxi_services().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/api/info/car-rentals") => {
            let res = service.get_car_rentals().await?;
            Ok(Response::new(StatusCode::OK, res))
        },
        (&Method::Get, "/merida-attractions") => {
             let res = service.get_merida_attractions().await?;
             Ok(Response::new(StatusCode::OK, res))
        },
        _ => Ok(Response::new(StatusCode::NOT_FOUND, "Not Found"))
    }
}
