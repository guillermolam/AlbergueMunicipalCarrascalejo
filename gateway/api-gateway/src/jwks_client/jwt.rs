use crate::jwks_client::error::{err_inv, Error};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{Map, Value};
use std::ops::Add;
use std::time::{Duration, SystemTime};

macro_rules! impl_segment {
    () => {
        pub fn new(json: Value) -> Self {
            Self { json }
        }

        pub fn get_str(&self, key: &str) -> Option<&str> {
            self.json.get(key)?.as_str()
        }

        pub fn get_i64(&self, key: &str) -> Option<i64> {
            self.json.get(key)?.as_i64()
        }

        pub fn get_u64(&self, key: &str) -> Option<u64> {
            self.json.get(key)?.as_u64()
        }

        pub fn get_f64(&self, key: &str) -> Option<f64> {
            self.json.get(key)?.as_f64()
        }

        pub fn get_bool(&self, key: &str) -> Option<bool> {
            self.json.get(key)?.as_bool()
        }

        pub fn get_object(&self, key: &str) -> Option<&Map<String, Value>> {
            self.json.get(key)?.as_object()
        }

        pub fn get_array(&self, key: &str) -> Option<&Vec<Value>> {
            self.json.get(key)?.as_array()
        }

        pub fn get_null(&self, key: &str) -> Option<()> {
            self.json.get(key)?.as_null()
        }

        pub fn into<T: DeserializeOwned>(&self) -> Result<T, Error> {
            Ok(serde_json::from_value::<T>(self.json.clone())
                .or(Err(err_inv("Failed to deserialize segment")))?)
        }
    };
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Header {
    pub(crate) json: Value,
}

impl Header {
    impl_segment!();

    pub fn alg(&self) -> Option<&str> {
        self.get_str("alg")
    }

    pub fn kid(&self) -> Option<&str> {
        self.get_str("kid")
    }

    pub fn typ(&self) -> Option<&str> {
        self.get_str("typ")
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Payload {
    pub(crate) json: Value,
}

impl Payload {
    impl_segment!();

    pub fn iss(&self) -> Option<&str> {
        self.get_str("iss")
    }

    pub fn sub(&self) -> Option<&str> {
        self.get_str("sub")
    }

    pub fn aud(&self) -> Option<&str> {
        self.get_str("aud")
    }

    pub fn exp(&self) -> Option<u64> {
        self.get_f64("exp").map(|f| f as u64)
    }

    pub fn nbf(&self) -> Option<u64> {
        self.get_f64("nbf").map(|f| f as u64)
    }

    pub fn iat(&self) -> Option<u64> {
        self.get_f64("iat").map(|f| f as u64)
    }

    pub fn expiry(&self) -> Option<SystemTime> {
        self.exp()
            .map(|time| SystemTime::UNIX_EPOCH.add(Duration::new(time, 0)))
    }

    pub fn not_before(&self) -> Option<SystemTime> {
        self.nbf()
            .map(|time| SystemTime::UNIX_EPOCH.add(Duration::new(time, 0)))
    }

    pub fn has_claim(&self, key: String) -> bool {
        self.json.get(key).is_some()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Jwt {
    header: Header,
    payload: Payload,
    signature: String,
}

impl Jwt {
    pub fn new(header: Header, payload: Payload, signature: String) -> Self {
        Jwt {
            header,
            payload,
            signature,
        }
    }

    pub fn header(&self) -> &Header {
        &self.header
    }

    pub fn payload(&self) -> &Payload {
        &self.payload
    }

    pub fn expired_time(&self, time: SystemTime) -> Option<bool> {
        self.payload.expiry().map(|token_time| time > token_time)
    }

    pub fn early_time(&self, time: SystemTime) -> Option<bool> {
        self.payload
            .not_before()
            .map(|token_time| time < token_time)
    }

    pub fn valid_time(&self, time: SystemTime) -> Option<bool> {
        Some(!self.expired_time(time)? && !self.early_time(time)?)
    }
}
