
use anyhow::Result;
use serde::{Deserialize, Serialize};
use spin_sdk::http::{Request, Response};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct TokenValidationRequest {
    token: String,
    token_type: String, // "access_token", "id_token", "refresh_token"
}

#[derive(Serialize, Deserialize)]
struct TokenValidationResponse {
    valid: bool,
    user_id: Option<String>,
    permissions: Vec<String>,
    scopes: Vec<String>,
    expires_at: Option<u64>,
    token_type: String,
    issuer: Option<String>,
    audience: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct OIDCUserInfo {
    sub: String,
    name: Option<String>,
    email: Option<String>,
    email_verified: Option<bool>,
    picture: Option<String>,
    roles: Vec<String>,
}

// Stateless pure function for extracting bearer token
fn extract_bearer_token(req: &Request) -> Option<String> {
    req.headers()
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|auth_header| {
            if auth_header.starts_with("Bearer ") {
                Some(auth_header[7..].to_string())
            } else {
                None
            }
        })
}

// Async stateless function for OAuth2 token validation
async fn validate_oauth2_token(token: &str, token_type: &str) -> Result<TokenValidationResponse> {
    let validation_task = tokio::task::spawn({
        let token = token.to_string();
        let token_type = token_type.to_string();
        async move {
            // Simulate token validation with Auth0/OAuth2 provider
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            
            // In real implementation, this would:
            // 1. Verify JWT signature
            // 2. Check token expiration
            // 3. Validate issuer and audience
            // 4. Extract user claims
            
            if token.starts_with("valid_") {
                TokenValidationResponse {
                    valid: true,
                    user_id: Some("user_123".to_string()),
                    permissions: vec![
                        "booking:read".to_string(),
                        "booking:write".to_string(),
                        "reviews:read".to_string(),
                    ],
                    scopes: vec![
                        "openid".to_string(),
                        "profile".to_string(),
                        "email".to_string(),
                    ],
                    expires_at: Some(
                        std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap()
                            .as_secs() + 3600
                    ),
                    token_type: token_type.clone(),
                    issuer: Some("https://albergue.eu.auth0.com/".to_string()),
                    audience: Some("albergue-api".to_string()),
                }
            } else {
                TokenValidationResponse {
                    valid: false,
                    user_id: None,
                    permissions: Vec::new(),
                    scopes: Vec::new(),
                    expires_at: None,
                    token_type: token_type.clone(),
                    issuer: None,
                    audience: None,
                }
            }
        }
    });
    
    validation_task.await.map_err(|e| e.into())
}

// Async stateless function for OpenID Connect userinfo endpoint
async fn get_oidc_userinfo(access_token: &str) -> Result<OIDCUserInfo> {
    let userinfo_task = tokio::task::spawn({
        let access_token = access_token.to_string();
        async move {
            // Simulate OIDC userinfo endpoint call
            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
            
            OIDCUserInfo {
                sub: "auth0|123456789".to_string(),
                name: Some("John Doe".to_string()),
                email: Some("john.doe@example.com".to_string()),
                email_verified: Some(true),
                picture: Some("https://example.com/avatar.jpg".to_string()),
                roles: vec!["guest".to_string(), "verified_user".to_string()],
            }
        }
    });
    
    userinfo_task.await.map_err(|e| e.into())
}

// Async stateless function for handling OAuth2 authorization code flow
async fn handle_authorization_code_flow(req: &Request) -> Result<Response> {
    let query_params = extract_query_params(req);
    
    if let (Some(code), Some(state)) = (query_params.get("code"), query_params.get("state")) {
        let token_exchange_task = tokio::task::spawn({
            let code = code.clone();
            let state = state.clone();
            async move {
                // Simulate token exchange
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                
                serde_json::json!({
                    "access_token": "valid_access_token_123",
                    "id_token": "valid_id_token_456",
                    "refresh_token": "valid_refresh_token_789",
                    "token_type": "Bearer",
                    "expires_in": 3600,
                    "scope": "openid profile email",
                    "state": state
                })
            }
        });
        
        let tokens = token_exchange_task.await?;
        
        Ok(Response::builder()
            .status(200)
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(tokens.to_string())
            .build())
    } else {
        let error_body = serde_json::json!({
            "error": "invalid_request",
            "error_description": "Missing authorization code or state parameter"
        });
        
        Ok(Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(error_body.to_string())
            .build())
    }
}

// Stateless pure function for query parameter extraction
fn extract_query_params(req: &Request) -> HashMap<String, String> {
    let mut params = HashMap::new();
    
    if let Some(query) = req.uri().query() {
        for pair in query.split('&') {
            if let Some((key, value)) = pair.split_once('=') {
                params.insert(
                    urlencoding::decode(key).unwrap_or_default().to_string(),
                    urlencoding::decode(value).unwrap_or_default().to_string(),
                );
            }
        }
    }
    
    params
}

// Main handler function for auth verification
pub async fn handle(req: &Request) -> Result<Response> {
    let path = req.uri().path();
    let method = req.method().as_str();
    
    match (method, path) {
        ("GET", "/api/auth/callback") => handle_authorization_code_flow(req).await,
        ("POST", "/api/auth/verify") => handle_token_verification(req).await,
        ("GET", "/api/auth/userinfo") => handle_userinfo_request(req).await,
        ("POST", "/api/auth/refresh") => handle_token_refresh(req).await,
        _ => {
            // Default verification for middleware
            if let Some(token) = extract_bearer_token(req) {
                let validation = validate_oauth2_token(&token, "access_token").await?;
                
                let response_body = serde_json::to_string(&validation)?;
                let status = if validation.valid { 200 } else { 401 };
                
                Ok(Response::builder()
                    .status(status)
                    .header("Content-Type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(response_body)
                    .build())
            } else {
                let error_body = serde_json::json!({
                    "error": "missing_token",
                    "error_description": "Authorization header with Bearer token required"
                });
                
                Ok(Response::builder()
                    .status(401)
                    .header("Content-Type", "application/json")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(error_body.to_string())
                    .build())
            }
        }
    }
}

async fn handle_token_verification(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let token_req: TokenValidationRequest = serde_json::from_str(body)?;
    
    let validation = validate_oauth2_token(&token_req.token, &token_req.token_type).await?;
    let response_body = serde_json::to_string(&validation)?;
    let status = if validation.valid { 200 } else { 401 };
    
    Ok(Response::builder()
        .status(status)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(response_body)
        .build())
}

async fn handle_userinfo_request(req: &Request) -> Result<Response> {
    if let Some(token) = extract_bearer_token(req) {
        let validation = validate_oauth2_token(&token, "access_token").await?;
        
        if validation.valid {
            let userinfo = get_oidc_userinfo(&token).await?;
            let response_body = serde_json::to_string(&userinfo)?;
            
            Ok(Response::builder()
                .status(200)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(response_body)
                .build())
        } else {
            let error_body = serde_json::json!({
                "error": "invalid_token",
                "error_description": "The access token is invalid or expired"
            });
            
            Ok(Response::builder()
                .status(401)
                .header("Content-Type", "application/json")
                .header("Access-Control-Allow-Origin", "*")
                .body(error_body.to_string())
                .build())
        }
    } else {
        let error_body = serde_json::json!({
            "error": "missing_token",
            "error_description": "Authorization header with Bearer token required"
        });
        
        Ok(Response::builder()
            .status(401)
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(error_body.to_string())
            .build())
    }
}

async fn handle_token_refresh(req: &Request) -> Result<Response> {
    let body = std::str::from_utf8(req.body())?;
    let refresh_data: serde_json::Value = serde_json::from_str(body)?;
    
    if let Some(refresh_token) = refresh_data["refresh_token"].as_str() {
        let refresh_task = tokio::task::spawn({
            let refresh_token = refresh_token.to_string();
            async move {
                // Simulate token refresh
                tokio::time::sleep(tokio::time::Duration::from_millis(75)).await;
                
                if refresh_token.starts_with("valid_") {
                    serde_json::json!({
                        "access_token": "new_valid_access_token_123",
                        "id_token": "new_valid_id_token_456",
                        "token_type": "Bearer",
                        "expires_in": 3600,
                        "scope": "openid profile email"
                    })
                } else {
                    serde_json::json!({
                        "error": "invalid_grant",
                        "error_description": "Invalid refresh token"
                    })
                }
            }
        });
        
        let result = refresh_task.await?;
        let status = if result.get("error").is_some() { 400 } else { 200 };
        
        Ok(Response::builder()
            .status(status)
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(result.to_string())
            .build())
    } else {
        let error_body = serde_json::json!({
            "error": "invalid_request",
            "error_description": "Missing refresh_token parameter"
        });
        
        Ok(Response::builder()
            .status(400)
            .header("Content-Type", "application/json")
            .header("Access-Control-Allow-Origin", "*")
            .body(error_body.to_string())
            .build())
    }
}
