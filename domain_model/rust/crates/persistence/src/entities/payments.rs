use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "payments")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub booking_id: i32,
  pub amount: Decimal,
  pub payment_type: String,
  pub payment_status: Option<String>,
  pub currency: Option<String>,
  pub receipt_number: Option<String>,
  pub payment_date: Option<DateTimeUtc>,
  pub payment_deadline: DateTimeUtc,
  pub transaction_id: Option<String>,
  pub gateway_response: Option<Json>,
  pub created_at: Option<DateTimeUtc>,
  pub updated_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::bookings::Entity",
    from = "Column::BookingId",
    to = "super::bookings::Column::Id"
  )]
  Booking,
}

impl Related<super::bookings::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Booking.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
