use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "bookings")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub pilgrim_id: i32,
  pub reference_number: String,
  pub check_in_date: Date,
  pub check_out_date: Date,
  pub number_of_nights: i32,
  pub number_of_persons: Option<i32>,
  pub number_of_rooms: Option<i32>,
  pub has_internet: Option<bool>,
  pub status: Option<String>,
  pub bed_assignment_id: Option<i32>,
  pub estimated_arrival_time: Option<String>,
  pub notes: Option<String>,
  pub total_amount: Decimal,
  pub reservation_expires_at: DateTimeUtc,
  pub payment_deadline: DateTimeUtc,
  pub auto_cleanup_processed: Option<bool>,
  pub created_at: Option<DateTimeUtc>,
  pub updated_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::pilgrims::Entity",
    from = "Column::PilgrimId",
    to = "super::pilgrims::Column::Id"
  )]
  Pilgrim,

  #[sea_orm(
    belongs_to = "super::beds::Entity",
    from = "Column::BedAssignmentId",
    to = "super::beds::Column::Id"
  )]
  Bed,

  #[sea_orm(has_many = "super::payments::Entity")]
  Payments,

  #[sea_orm(has_many = "super::government_submissions::Entity")]
  GovernmentSubmissions,

  #[sea_orm(has_many = "super::notifications::Entity")]
  Notifications,
}

impl Related<super::pilgrims::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Pilgrim.def()
  }
}

impl Related<super::beds::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Bed.def()
  }
}

impl Related<super::payments::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Payments.def()
  }
}

impl Related<super::government_submissions::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::GovernmentSubmissions.def()
  }
}

impl Related<super::notifications::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Notifications.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
