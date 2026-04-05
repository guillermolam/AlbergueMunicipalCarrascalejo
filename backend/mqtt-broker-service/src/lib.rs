#![deny(warnings)]
#![warn(clippy::all)]

use worker::*;

#[event(fetch)]
async fn fetch(req: Request, _env: Env, _ctx: Context) -> Result<Response> {
    match req.method() {
        Method::Post => Response::ok("MQTT service ready - publish endpoint available"),
        _ => Response::error("Not found", 404),
    }
}
