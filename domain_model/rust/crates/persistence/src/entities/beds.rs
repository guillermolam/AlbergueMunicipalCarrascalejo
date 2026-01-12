use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "beds")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub bed_number: i32,
  pub room_number: i32,
  pub room_name: String,
  pub room_type: Option<String>,
  pub price_per_night: Decimal,
  pub currency: Option<String>,
  pub is_available: Option<bool>,
  pub status: Option<String>,
  pub reserved_until: Option<DateTimeUtc>,
  pub last_cleaned_at: Option<DateTimeUtc>,
  pub maintenance_notes: Option<String>,
  pub created_at: Option<DateTimeUtc>,
  pub updated_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(has_many = "super::bookings::Entity")]
  Bookings,
}

impl Related<super::bookings::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Bookings.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
