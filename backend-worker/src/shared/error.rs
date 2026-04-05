use worker::*;

pub fn json_error(status: u16, message: &str) -> Result<Response> {
    let body = serde_json::json!({
        "error": message,
        "status": status
    });

    let mut resp = Response::from_json(&body)?;
    resp = resp.with_status(status);
    Ok(resp)
}
