use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "notifications")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub booking_id: Option<i32>,
  pub pilgrim_id: Option<i32>,
  pub channel: String,
  pub recipient: String,
  pub subject: Option<String>,
  pub message: String,
  pub status: Option<String>,
  pub provider_message_id: Option<String>,
  pub error_message: Option<String>,
  pub sent_at: Option<DateTimeUtc>,
  pub created_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::bookings::Entity",
    from = "Column::BookingId",
    to = "super::bookings::Column::Id"
  )]
  Booking,

  #[sea_orm(
    belongs_to = "super::pilgrims::Entity",
    from = "Column::PilgrimId",
    to = "super::pilgrims::Column::Id"
  )]
  Pilgrim,
}

impl Related<super::bookings::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Booking.def()
  }
}

impl Related<super::pilgrims::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Pilgrim.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
