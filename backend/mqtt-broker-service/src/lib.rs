#![deny(warnings)]
#![warn(clippy::all)]

use spin_sdk::{
    http::{Method, Request, Response},
    http_component,
};

#[http_component]
async fn handle_publish(req: Request) -> Result<Response, std::convert::Infallible> {
    let method = req.method();

    match method {
        Method::Post => {
            Ok(Response::new(200, "MQTT service ready - publish endpoint available".to_string()))
        }
        _ => Ok(Response::new(404, "Not found".to_string()))
    }
}
