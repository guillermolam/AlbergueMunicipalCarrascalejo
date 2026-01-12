use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Pricing::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Pricing::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Pricing::RoomType).string().not_null())
          .col(ColumnDef::new(Pricing::BedType).string().not_null())
          .col(ColumnDef::new(Pricing::PricePerNight).decimal_len(10, 2).not_null())
          .col(ColumnDef::new(Pricing::Currency).string().null())
          .col(ColumnDef::new(Pricing::IsActive).boolean().null())
          .col(ColumnDef::new(Pricing::CreatedAt).timestamp().null())
          .col(ColumnDef::new(Pricing::UpdatedAt).timestamp().null())
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_pricing_room_bed")
          .table(Pricing::Table)
          .col(Pricing::RoomType)
          .col(Pricing::BedType)
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(Pricing::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum Pricing {
  Table,
  Id,
  RoomType,
  BedType,
  PricePerNight,
  Currency,
  IsActive,
  CreatedAt,
  UpdatedAt,
}
