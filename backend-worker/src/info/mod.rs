use worker::*;

pub async fn handle_info(_req: Request, ctx: RouteContext<()>) -> Result<Response> {
    let category = ctx.param("category").cloned().unwrap_or_default();

    match category.as_str() {
        "emergency-contacts" => Response::from_json(&serde_json::json!({
            "contacts": [
                {"name": "Emergencias", "phone": "112", "type": "emergency"},
                {"name": "Guardia Civil Carrascalejo", "phone": "+34 924 123 456", "type": "police"},
                {"name": "Centro de Salud", "phone": "+34 924 789 012", "type": "health"},
                {"name": "Albergue Municipal", "phone": "+34 924 345 678", "type": "accommodation"}
            ]
        })),
        "carrascalejo-info" => Response::from_json(&serde_json::json!({
            "name": "El Carrascalejo",
            "province": "Badajoz",
            "community": "Extremadura",
            "camino": "Vía de la Plata",
            "altitude": "340m",
            "population": "~250",
            "services": ["albergue", "fuente", "bar", "tienda"]
        })),
        "route-map" => Response::from_json(&serde_json::json!({
            "current_stage": "Carrascalejo",
            "next_stage": "Aljucén (15km)",
            "previous_stage": "Mérida (18km)",
            "camino": "Vía de la Plata"
        })),
        "restaurants" | "taxis" | "car-rentals" | "merida-attractions" => {
            // Fetch from cache or external APIs
            let kv = ctx.kv("CACHE")?;
            let cache_key = format!("info:{category}");

            if let Some(cached) = kv.get(&cache_key).text().await? {
                return Response::from_json(&serde_json::from_str::<serde_json::Value>(&cached)?);
            }

            let placeholder = serde_json::json!({
                "category": category,
                "items": [],
                "message": "Data being loaded. Check back shortly."
            });

            Response::from_json(&placeholder)
        }
        "all-cards" => Response::from_json(&serde_json::json!({
            "categories": ["emergency-contacts", "carrascalejo-info", "route-map", "restaurants", "taxis", "merida-attractions"]
        })),
        _ => Response::error("Category not found", 404),
    }
}
