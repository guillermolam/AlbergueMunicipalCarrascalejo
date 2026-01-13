use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use crate::identity::PilgrimId;
use crate::money::Money;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BookingId(pub i32);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BedId(pub i32);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReferenceNumber(pub String);

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct BookingPeriod {
    pub check_in: NaiveDate,
    pub check_out: NaiveDate,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Booking {
    pub id: BookingId,
    pub pilgrim_id: PilgrimId,
    pub reference: ReferenceNumber,
    pub period: BookingPeriod,
    pub total: Money,
    pub bed_id: Option<BedId>,
}
