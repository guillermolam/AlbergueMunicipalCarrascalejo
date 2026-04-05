//! Unit tests for the auth-service.
//!
//! These tests exercise pure logic that does not require network access or the
//! Cloudflare Workers runtime: URL construction, serialization/deserialization
//! of domain types, configuration parsing helpers, and provider metadata.

#[cfg(test)]
mod tests {
    use auth::config::{Claims, TokenResponse};
    use auth::providers::github::GitHubProvider;

    // -----------------------------------------------------------------------
    // GitHub provider URL construction
    // -----------------------------------------------------------------------

    fn make_github_provider() -> GitHubProvider {
        GitHubProvider {
            client_id: "gh-client-123".into(),
            client_secret: "test-only-not-a-real-value".into(),
            redirect_uri: "https://example.com/callback".into(),
        }
    }

    #[test]
    fn github_authorization_url_contains_client_id() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let url = p.authorization_url("random-state");
        assert!(
            url.contains("client_id=gh-client-123"),
            "URL should contain client_id: {url}"
        );
    }

    #[test]
    fn github_authorization_url_contains_redirect_uri() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let url = p.authorization_url("s");
        assert!(
            url.contains("redirect_uri="),
            "URL should contain redirect_uri: {url}"
        );
        // URL-encoded form of "https://example.com/callback"
        assert!(
            url.contains("example.com"),
            "URL should contain the redirect host: {url}"
        );
    }

    #[test]
    fn github_authorization_url_contains_state() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let url = p.authorization_url("my-csrf-state");
        assert!(
            url.contains("state=my-csrf-state"),
            "URL should contain the state parameter: {url}"
        );
    }

    #[test]
    fn github_authorization_url_contains_scope() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let url = p.authorization_url("s");
        // "read:user user:email" URL-encoded becomes "read%3Auser+user%3Aemail"
        assert!(
            url.contains("scope="),
            "URL should contain scope parameter: {url}"
        );
    }

    #[test]
    fn github_authorization_url_starts_with_github_domain() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let url = p.authorization_url("s");
        assert!(
            url.starts_with("https://github.com/login/oauth/authorize"),
            "URL should start with GitHub authorize endpoint: {url}"
        );
    }

    #[test]
    fn github_provider_name() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        assert_eq!(p.name(), "github");
    }

    #[test]
    fn github_jwks_uri_is_empty() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        assert!(
            p.jwks_uri().is_empty(),
            "GitHub does not provide a JWKS URI"
        );
    }

    // -----------------------------------------------------------------------
    // TokenResponse deserialization
    // -----------------------------------------------------------------------

    #[test]
    fn token_response_deserializes_full_payload() {
        let json = r#"{
            "access_token": "test_fake_token_abc123",
            "refresh_token": "ghr_xyz789",
            "id_token": "eyJhbGciOi...",
            "expires_in": 3600,
            "token_type": "bearer"
        }"#;
        let resp: TokenResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(resp.access_token, "test_fake_token_abc123");
        assert_eq!(resp.refresh_token.as_deref(), Some("ghr_xyz789"));
        assert_eq!(resp.id_token.as_deref(), Some("eyJhbGciOi..."));
        assert_eq!(resp.expires_in, Some(3600));
        assert_eq!(resp.token_type, "bearer");
    }

    #[test]
    fn token_response_deserializes_minimal_payload() {
        let json = r#"{
            "access_token": "tok_minimal",
            "token_type": "bearer"
        }"#;
        let resp: TokenResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(resp.access_token, "tok_minimal");
        assert!(resp.refresh_token.is_none());
        assert!(resp.id_token.is_none());
        assert!(resp.expires_in.is_none());
    }

    #[test]
    fn token_response_rejects_missing_access_token() {
        let json = r#"{ "token_type": "bearer" }"#;
        let result = serde_json::from_str::<TokenResponse>(json);
        assert!(result.is_err(), "Should fail without access_token");
    }

    #[test]
    fn token_response_rejects_missing_token_type() {
        let json = r#"{ "access_token": "tok" }"#;
        let result = serde_json::from_str::<TokenResponse>(json);
        assert!(result.is_err(), "Should fail without token_type");
    }

    // -----------------------------------------------------------------------
    // Claims serialization
    // -----------------------------------------------------------------------

    #[test]
    fn claims_serializes_to_json() {
        let claims = Claims {
            sub: "user-42".into(),
            exp: 1_700_000_000,
            aud: "my-app".into(),
            iss: "workers-auth-service".into(),
        };
        let json = serde_json::to_value(&claims).expect("should serialize");
        assert_eq!(json["sub"], "user-42");
        assert_eq!(json["exp"], 1_700_000_000);
        assert_eq!(json["aud"], "my-app");
        assert_eq!(json["iss"], "workers-auth-service");
    }

    #[test]
    fn claims_round_trip_with_jsonwebtoken() {
        use jsonwebtoken::{
            decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation,
        };

        let claims = Claims {
            sub: "user-99".into(),
            exp: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp() as usize,
            aud: "test-client".into(),
            iss: "workers-auth-service".into(),
        };

        let secret = b"test-secret-key";
        let token = encode(
            &Header::new(Algorithm::HS256),
            &claims,
            &EncodingKey::from_secret(secret),
        )
        .expect("encoding should succeed");

        let mut validation = Validation::new(Algorithm::HS256);
        validation.set_audience(&["test-client"]);
        validation.set_issuer(&["workers-auth-service"]);

        let decoded = decode::<Claims>(&token, &DecodingKey::from_secret(secret), &validation)
            .expect("decoding should succeed");

        assert_eq!(decoded.claims.sub, "user-99");
        assert_eq!(decoded.claims.aud, "test-client");
        assert_eq!(decoded.claims.iss, "workers-auth-service");
    }

    // -----------------------------------------------------------------------
    // Well-known configuration structure
    // -----------------------------------------------------------------------

    #[test]
    fn well_known_config_structure() {
        // Mirrors the JSON built in well_known_handler
        let issuer = "https://alberguecarrascalejo.workers.dev/api/auth";
        let config = serde_json::json!({
            "issuer": issuer,
            "authorization_endpoint": format!("{}/login", issuer),
            "token_endpoint": format!("{}/callback", issuer),
            "jwks_uri": format!("{}/.well-known/jwks.json", issuer),
            "response_types_supported": ["code"],
            "subject_types_supported": ["public"],
            "id_token_signing_alg_values_supported": ["RS256", "HS256"],
        });

        assert_eq!(
            config["issuer"],
            "https://alberguecarrascalejo.workers.dev/api/auth"
        );
        assert_eq!(
            config["authorization_endpoint"],
            "https://alberguecarrascalejo.workers.dev/api/auth/login"
        );
        assert_eq!(
            config["token_endpoint"],
            "https://alberguecarrascalejo.workers.dev/api/auth/callback"
        );
        assert_eq!(
            config["jwks_uri"],
            "https://alberguecarrascalejo.workers.dev/api/auth/.well-known/jwks.json"
        );
        assert!(config["response_types_supported"].is_array());
        assert_eq!(config["response_types_supported"][0], "code");
    }

    // -----------------------------------------------------------------------
    // Config / environment parsing helpers
    // -----------------------------------------------------------------------

    #[test]
    fn redirect_uri_construction() {
        let origin = "https://my-logto.example.com";
        let redirect = format!("{}/sign-in-callback", origin);
        assert_eq!(redirect, "https://my-logto.example.com/sign-in-callback");
    }

    #[test]
    fn zitadel_issuer_url_construction() {
        let domain = "auth.example.com";
        let issuer = format!("https://{domain}/oidc");
        assert_eq!(issuer, "https://auth.example.com/oidc");
    }

    #[test]
    fn token_ttl_default_parsing() {
        let default_str = "3600";
        let ttl: i64 = default_str.parse().expect("should parse");
        assert_eq!(ttl, 3600);
        let duration = chrono::Duration::seconds(ttl);
        assert_eq!(duration.num_seconds(), 3600);
    }

    #[test]
    fn token_ttl_custom_parsing() {
        let custom_str = "7200";
        let ttl: i64 = custom_str.parse().expect("should parse");
        let duration = chrono::Duration::seconds(ttl);
        assert_eq!(duration.num_seconds(), 7200);
    }

    #[test]
    fn token_ttl_invalid_string_fails() {
        let invalid = "not-a-number";
        let result: Result<i64, _> = invalid.parse();
        assert!(result.is_err());
    }

    // -----------------------------------------------------------------------
    // GitHub refresh_token returns error (not supported)
    // -----------------------------------------------------------------------

    #[tokio::test]
    async fn github_refresh_token_returns_error() {
        use auth::config::IdentityProvider;
        let p = make_github_provider();
        let result = p.refresh_token("some-token").await;
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(
            err_msg.contains("not implemented"),
            "Error should mention not implemented: {err_msg}"
        );
    }
}
