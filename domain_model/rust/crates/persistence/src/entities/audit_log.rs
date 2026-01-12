use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "audit_log")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub table_name: String,
  pub record_id: String,
  pub action: String,
  pub old_values: Option<Json>,
  pub new_values: Option<Json>,
  pub user_id: Option<i32>,
  pub ip_address: Option<String>,
  pub user_agent: Option<String>,
  pub created_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::users::Entity",
    from = "Column::UserId",
    to = "super::users::Column::Id"
  )]
  User,
}

impl Related<super::users::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::User.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
