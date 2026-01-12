use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Notifications::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Notifications::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Notifications::BookingId).integer().null())
          .col(ColumnDef::new(Notifications::PilgrimId).integer().null())
          .col(ColumnDef::new(Notifications::Channel).string().not_null())
          .col(ColumnDef::new(Notifications::Recipient).string().not_null())
          .col(ColumnDef::new(Notifications::Subject).string().null())
          .col(ColumnDef::new(Notifications::Message).text().not_null())
          .col(ColumnDef::new(Notifications::Status).string().null())
          .col(ColumnDef::new(Notifications::ProviderMessageId).string().null())
          .col(ColumnDef::new(Notifications::ErrorMessage).text().null())
          .col(ColumnDef::new(Notifications::SentAt).timestamp().null())
          .col(ColumnDef::new(Notifications::CreatedAt).timestamp().null())
          .foreign_key(
            ForeignKey::create()
              .name("fk_notifications_booking")
              .from(Notifications::Table, Notifications::BookingId)
              .to(Bookings::Table, Bookings::Id),
          )
          .foreign_key(
            ForeignKey::create()
              .name("fk_notifications_pilgrim")
              .from(Notifications::Table, Notifications::PilgrimId)
              .to(Pilgrims::Table, Pilgrims::Id),
          )
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_notifications_booking")
          .table(Notifications::Table)
          .col(Notifications::BookingId)
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_notifications_pilgrim")
          .table(Notifications::Table)
          .col(Notifications::PilgrimId)
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(
        Table::drop()
          .table(Notifications::Table)
          .if_exists()
          .to_owned(),
      )
      .await
  }
}

#[derive(DeriveIden)]
enum Notifications {
  Table,
  Id,
  BookingId,
  PilgrimId,
  Channel,
  Recipient,
  Subject,
  Message,
  Status,
  ProviderMessageId,
  ErrorMessage,
  SentAt,
  CreatedAt,
}

#[derive(DeriveIden)]
enum Bookings {
  Table,
  Id,
}

#[derive(DeriveIden)]
enum Pilgrims {
  Table,
  Id,
}
