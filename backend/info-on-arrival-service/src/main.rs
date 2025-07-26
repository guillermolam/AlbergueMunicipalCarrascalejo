use wasm_bindgen::prelude::*;
use shared::{AlbergueError, AlbergueResult};

mod domain;
mod application;
mod ports;
mod adapters;
mod infrastructure;

pub use domain::*;
pub use application::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct InfoOnArrivalService {
    service: application::CardsServiceImpl,
}

#[wasm_bindgen]
impl InfoOnArrivalService {
    #[wasm_bindgen(constructor)]
    pub fn new() -> InfoOnArrivalService {
        let service = application::CardsServiceImpl::new();
        InfoOnArrivalService { service }
    }

    #[wasm_bindgen]
    pub async fn get_merida_attractions(&self) -> Result<String, JsValue> {
        self.service
            .get_merida_attractions()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_carrascalejo_info(&self) -> Result<String, JsValue> {
        self.service
            .get_carrascalejo_info()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_emergency_contacts(&self) -> Result<String, JsValue> {
        self.service
            .get_emergency_contacts()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_route_map(&self, next_stage: &str) -> Result<String, JsValue> {
        self.service
            .get_route_map(next_stage)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_all_cards(&self) -> Result<String, JsValue> {
        self.service
            .get_all_info_cards()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_restaurants(&self) -> Result<String, JsValue> {
        self.service
            .get_restaurants_eat()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_taxis(&self) -> Result<String, JsValue> {
        self.service
            .get_taxi_services()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn get_car_rentals(&self) -> Result<String, JsValue> {
        self.service
            .get_car_rentals()
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    #[wasm_bindgen]
    pub async fn update_card_content(&self, card_id: &str, content: &str) -> Result<String, JsValue> {
        self.service
            .update_card_content(card_id, content)
            .await
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[tokio::main]
async fn main() -> AlbergueResult<()> {
    infrastructure::config::init_logging();
    let server = infrastructure::server::create_server().await?;
    server.run().await
}