use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct CurrencyCode(pub String);

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Money {
  pub amount: rust_decimal::Decimal,
  pub currency: CurrencyCode,
}
