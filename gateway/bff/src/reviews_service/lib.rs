
use anyhow::Result;
use spin_sdk::http::{Request, Response};

pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("GET", "/api/reviews/list") => handle_list_reviews(req).await,
        ("POST", "/api/reviews/create") => handle_create_review(req).await,
        ("GET", path) if path.starts_with("/api/reviews/") => handle_get_review(req).await,
        _ => {
            let error_body = serde_json::json!({
                "error": "Not Found",
                "message": "Reviews endpoint not found"
            });
            
            Ok(Response::builder()
                .status(404)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(error_body.to_string())
                .build())
        }
    }
}

async fn handle_list_reviews(_req: &Request) -> Result<Response> {
    let reviews = serde_json::json!({
        "reviews": [
            {
                "id": "review_001",
                "guest_name": "María García",
                "rating": 5,
                "comment": "Excelente albergue, muy limpio y acogedor",
                "language": "es",
                "date": "2024-01-15"
            },
            {
                "id": "review_002", 
                "guest_name": "John Smith",
                "rating": 4,
                "comment": "Great hostel with friendly staff",
                "language": "en",
                "date": "2024-01-10"
            },
            {
                "id": "review_003",
                "guest_name": "Pierre Dubois",
                "rating": 5,
                "comment": "Parfait pour les pèlerins, très bon accueil",
                "language": "fr",
                "date": "2024-01-08"
            }
        ],
        "total": 3,
        "average_rating": 4.7
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(reviews.to_string())
        .build())
}

async fn handle_create_review(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let review_data: serde_json::Value = serde_json::from_str(body)?;
    
    let new_review = serde_json::json!({
        "id": format!("review_{}", uuid::Uuid::new_v4().simple()),
        "guest_name": review_data["guest_name"],
        "rating": review_data["rating"],
        "comment": review_data["comment"],
        "language": review_data["language"],
        "date": chrono::Utc::now().format("%Y-%m-%d").to_string(),
        "status": "published"
    });
    
    Ok(Response::builder()
        .status(201)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(new_review.to_string())
        .build())
}

async fn handle_get_review(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let review_id = path.strip_prefix("/api/reviews/").unwrap_or("unknown");
    
    let review = serde_json::json!({
        "id": review_id,
        "guest_name": "Sample Guest",
        "rating": 5,
        "comment": "Great experience!",
        "language": "en",
        "date": "2024-01-15"
    });
    
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(review.to_string())
        .build())
}
