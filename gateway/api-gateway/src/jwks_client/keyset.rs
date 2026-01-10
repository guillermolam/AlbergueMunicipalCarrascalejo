use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ring::signature::{RsaPublicKeyComponents, RSA_PKCS1_2048_8192_SHA256};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use spin_sdk::http;
use std::time::{SystemTime};

use crate::jwks_client::error::*;
use crate::jwks_client::jwt::*;

type HeaderBody = String;
pub type Signature = String;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JwtKey {
    #[serde(default)]
    pub e: String,
    pub kty: String,
    pub alg: Option<String>,
    #[serde(default)]
    pub n: String,
    pub kid: String,
}

pub struct KeyStore {
    key_url: String,
    keys: Vec<JwtKey>,
}

impl KeyStore {
    pub fn new() -> KeyStore {
        KeyStore {
            key_url: String::new(),
            keys: Vec::new(),
        }
    }

    pub async fn new_from(jwks_url: String) -> Result<KeyStore, Error> {
        let mut keystore = KeyStore::new();
        keystore.load_keys_from(jwks_url).await?;
        Ok(keystore)
    }

    pub async fn load_keys_from(&mut self, url: String) -> Result<(), Error> {
        self.key_url = url;
        self.load_keys().await
    }

    pub async fn load_keys(&mut self) -> Result<(), Error> {
        #[derive(Deserialize)]
        pub struct JwtKeys {
            pub keys: Vec<JwtKey>,
        }

        let req = http::Request::builder()
            .method(http::Method::Get)
            .uri(&self.key_url)
            .body(())
            .build();

        let res: http::Response = http::send(req)
            .await
            .map_err(|_| err_con("Failed to fetch keys"))?;

        let jwt_keys: JwtKeys =
            serde_json::from_slice(res.body()).map_err(|_| err_con("Failed to parse keys"))?;

        self.keys = jwt_keys.keys;
        Ok(())
    }

    pub fn key_by_id(&self, kid: &str) -> Option<&JwtKey> {
        self.keys.iter().find(|key| key.kid == kid)
    }

    fn decode_segments(
        &self,
        token: &str,
    ) -> Result<(Header, Payload, Signature, HeaderBody), Error> {
        let raw_segments: Vec<&str> = token.split('.').collect();
        if raw_segments.len() != 3 {
            return Err(err_inv("JWT does not have 3 segments"));
        }

        let header_segment = raw_segments[0];
        let payload_segment = raw_segments[1];
        let signature_segment = raw_segments[2].to_string();

        let header = Header::new(
            decode_segment::<Value>(header_segment)
                .map_err(|_| err_hea("Failed to decode header"))?,
        );
        let payload = Payload::new(
            decode_segment::<Value>(payload_segment)
                .map_err(|_| err_pay("Failed to decode payload"))?,
        );

        let body = format!("{}.{}", header_segment, payload_segment);

        Ok((header, payload, signature_segment, body))
    }

    pub fn verify_time(&self, token: &str, time: SystemTime) -> Result<Jwt, Error> {
        let (header, payload, signature, body) = self.decode_segments(token)?;

        if header.alg() != Some("RS256") {
            return Err(err_inv("Unsupported algorithm"));
        }

        let kid = header.kid().ok_or(err_key("No key id"))?;

        let key = self
            .key_by_id(kid)
            .ok_or(err_key("JWT key does not exist"))?;

        let e = URL_SAFE_NO_PAD
            .decode(&key.e)
            .map_err(|_| err_cer("Failed to decode exponent"))?;
        let n = URL_SAFE_NO_PAD
            .decode(&key.n)
            .map_err(|_| err_cer("Failed to decode modulus"))?;

        verify_signature(&e, &n, &body, &signature)?;

        let jwt = Jwt::new(header, payload, signature);

        if jwt.expired_time(time).unwrap_or(false) {
            return Err(err_exp("Token expired"));
        }
        if jwt.early_time(time).unwrap_or(false) {
            return Err(err_nbf("Too early to use token (nbf)"));
        }

        Ok(jwt)
    }

    pub fn verify(&self, token: &str) -> Result<Jwt, Error> {
        self.verify_time(token, SystemTime::now())
    }
}

fn verify_signature(e: &[u8], n: &[u8], message: &str, signature: &str) -> Result<(), Error> {
    let sig_bytes = URL_SAFE_NO_PAD
        .decode(signature)
        .map_err(|_| err_sig("Failed to decode signature"))?;

    let public_key = RsaPublicKeyComponents { n, e };

    public_key
        .verify(&RSA_PKCS1_2048_8192_SHA256, message.as_bytes(), &sig_bytes)
        .map_err(|_| err_sig("Signature verification failed"))?;

    Ok(())
}

fn decode_segment<T: DeserializeOwned>(segment: &str) -> Result<T, Error> {
    let decoded = URL_SAFE_NO_PAD
        .decode(segment)
        .map_err(|_| err_inv("Failed to decode segment"))?;

    serde_json::from_slice(&decoded).map_err(|_| err_inv("Failed to parse segment"))
}
