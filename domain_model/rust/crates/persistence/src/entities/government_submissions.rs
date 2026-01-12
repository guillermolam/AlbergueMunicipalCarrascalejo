use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "government_submissions")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub booking_id: i32,
  pub xml_content: String,
  pub submission_status: Option<String>,
  pub response_data: Option<Json>,
  pub attempts: Option<i32>,
  pub last_attempt: Option<DateTimeUtc>,
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
}

impl Related<super::bookings::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Booking.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
