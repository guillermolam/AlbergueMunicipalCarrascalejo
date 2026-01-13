use rust_decimal::Decimal;
use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "pricing")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub room_type: String,
    pub bed_type: String,
    pub price_per_night: Decimal,
    pub currency: Option<String>,
    pub is_active: Option<bool>,
    pub created_at: Option<DateTimeUtc>,
    pub updated_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
