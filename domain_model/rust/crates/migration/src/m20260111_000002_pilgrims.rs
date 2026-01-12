use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Pilgrims::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Pilgrims::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Pilgrims::FirstNameEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::LastName1Encrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::LastName2Encrypted).text().null())
          .col(ColumnDef::new(Pilgrims::BirthDateEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::DocumentType).string().not_null())
          .col(ColumnDef::new(Pilgrims::DocumentNumberEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::DocumentSupport).string().null())
          .col(ColumnDef::new(Pilgrims::Gender).string().not_null())
          .col(ColumnDef::new(Pilgrims::Nationality).string().null())
          .col(ColumnDef::new(Pilgrims::PhoneEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::EmailEncrypted).text().null())
          .col(ColumnDef::new(Pilgrims::AddressCountry).string().not_null())
          .col(ColumnDef::new(Pilgrims::AddressStreetEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::AddressStreet2Encrypted).text().null())
          .col(ColumnDef::new(Pilgrims::AddressCityEncrypted).text().not_null())
          .col(ColumnDef::new(Pilgrims::AddressPostalCode).string().not_null())
          .col(ColumnDef::new(Pilgrims::AddressProvince).string().null())
          .col(ColumnDef::new(Pilgrims::AddressMunicipalityCode).string().null())
          .col(ColumnDef::new(Pilgrims::IdPhotoUrl).string().null())
          .col(ColumnDef::new(Pilgrims::Language).string().null())
          .col(ColumnDef::new(Pilgrims::ConsentGiven).boolean().null())
          .col(ColumnDef::new(Pilgrims::ConsentDate).timestamp().null())
          .col(ColumnDef::new(Pilgrims::DataRetentionUntil).timestamp().null())
          .col(ColumnDef::new(Pilgrims::LastAccessDate).timestamp().null())
          .col(ColumnDef::new(Pilgrims::CreatedAt).timestamp().null())
          .col(ColumnDef::new(Pilgrims::UpdatedAt).timestamp().null())
          .to_owned(),
      )
      .await
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(Pilgrims::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum Pilgrims {
  Table,
  Id,
  FirstNameEncrypted,
  LastName1Encrypted,
  LastName2Encrypted,
  BirthDateEncrypted,
  DocumentType,
  DocumentNumberEncrypted,
  DocumentSupport,
  Gender,
  Nationality,
  PhoneEncrypted,
  EmailEncrypted,
  AddressCountry,
  AddressStreetEncrypted,
  AddressStreet2Encrypted,
  AddressCityEncrypted,
  AddressPostalCode,
  AddressProvince,
  AddressMunicipalityCode,
  IdPhotoUrl,
  Language,
  ConsentGiven,
  ConsentDate,
  DataRetentionUntil,
  LastAccessDate,
  CreatedAt,
  UpdatedAt,
}
