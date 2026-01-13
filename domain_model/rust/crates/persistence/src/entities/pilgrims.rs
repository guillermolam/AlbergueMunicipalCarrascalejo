use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "pilgrims")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub first_name_encrypted: String,
    pub last_name_1_encrypted: String,
    pub last_name_2_encrypted: Option<String>,
    pub birth_date_encrypted: String,
    pub document_type: String,
    pub document_number_encrypted: String,
    pub document_support: Option<String>,
    pub gender: String,
    pub nationality: Option<String>,
    pub phone_encrypted: String,
    pub email_encrypted: Option<String>,
    pub address_country: String,
    pub address_street_encrypted: String,
    pub address_street_2_encrypted: Option<String>,
    pub address_city_encrypted: String,
    pub address_postal_code: String,
    pub address_province: Option<String>,
    pub address_municipality_code: Option<String>,
    pub id_photo_url: Option<String>,
    pub language: Option<String>,
    pub consent_given: Option<bool>,
    pub consent_date: Option<DateTimeUtc>,
    pub data_retention_until: Option<DateTimeUtc>,
    pub last_access_date: Option<DateTimeUtc>,
    pub created_at: Option<DateTimeUtc>,
    pub updated_at: Option<DateTimeUtc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::bookings::Entity")]
    Bookings,
    #[sea_orm(has_many = "super::notifications::Entity")]
    Notifications,
}

impl Related<super::bookings::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Bookings.def()
    }
}

impl Related<super::notifications::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Notifications.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
