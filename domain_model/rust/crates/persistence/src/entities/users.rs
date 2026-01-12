use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
  #[sea_orm(primary_key)]
  pub id: i32,
  pub username: String,
  pub password: String,
  pub created_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(has_many = "super::audit_log::Entity")]
  AuditLog,
}

impl Related<super::audit_log::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::AuditLog.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}
