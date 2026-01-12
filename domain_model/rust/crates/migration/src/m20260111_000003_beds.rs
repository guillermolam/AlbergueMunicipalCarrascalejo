use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Beds::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Beds::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Beds::BedNumber).integer().not_null())
          .col(ColumnDef::new(Beds::RoomNumber).integer().not_null())
          .col(ColumnDef::new(Beds::RoomName).string().not_null())
          .col(ColumnDef::new(Beds::RoomType).string().null())
          .col(ColumnDef::new(Beds::PricePerNight).decimal_len(10, 2).not_null())
          .col(ColumnDef::new(Beds::Currency).string().null())
          .col(ColumnDef::new(Beds::IsAvailable).boolean().null())
          .col(ColumnDef::new(Beds::Status).string().null())
          .col(ColumnDef::new(Beds::ReservedUntil).timestamp().null())
          .col(ColumnDef::new(Beds::LastCleanedAt).timestamp().null())
          .col(ColumnDef::new(Beds::MaintenanceNotes).text().null())
          .col(ColumnDef::new(Beds::CreatedAt).timestamp().null())
          .col(ColumnDef::new(Beds::UpdatedAt).timestamp().null())
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_beds_bed_number")
          .table(Beds::Table)
          .col(Beds::BedNumber)
          .unique()
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(Beds::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum Beds {
  Table,
  Id,
  BedNumber,
  RoomNumber,
  RoomName,
  RoomType,
  PricePerNight,
  Currency,
  IsAvailable,
  Status,
  ReservedUntil,
  LastCleanedAt,
  MaintenanceNotes,
  CreatedAt,
  UpdatedAt,
}
