use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct PilgrimId(pub i32);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct AddressCountry(pub String);
