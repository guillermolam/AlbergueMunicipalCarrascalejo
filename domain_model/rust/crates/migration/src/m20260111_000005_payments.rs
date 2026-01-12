use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Payments::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Payments::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Payments::BookingId).integer().not_null())
          .col(ColumnDef::new(Payments::Amount).decimal_len(10, 2).not_null())
          .col(ColumnDef::new(Payments::PaymentType).string().not_null())
          .col(ColumnDef::new(Payments::PaymentStatus).string().null())
          .col(ColumnDef::new(Payments::Currency).string().null())
          .col(ColumnDef::new(Payments::ReceiptNumber).string().null())
          .col(ColumnDef::new(Payments::PaymentDate).timestamp().null())
          .col(ColumnDef::new(Payments::PaymentDeadline).timestamp().not_null())
          .col(ColumnDef::new(Payments::TransactionId).string().null())
          .col(ColumnDef::new(Payments::GatewayResponse).json().null())
          .col(ColumnDef::new(Payments::CreatedAt).timestamp().null())
          .col(ColumnDef::new(Payments::UpdatedAt).timestamp().null())
          .foreign_key(
            ForeignKey::create()
              .name("fk_payments_booking")
              .from(Payments::Table, Payments::BookingId)
              .to(Bookings::Table, Bookings::Id),
          )
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_payments_booking_id")
          .table(Payments::Table)
          .col(Payments::BookingId)
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(Payments::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum Payments {
  Table,
  Id,
  BookingId,
  Amount,
  PaymentType,
  PaymentStatus,
  Currency,
  ReceiptNumber,
  PaymentDate,
  PaymentDeadline,
  TransactionId,
  GatewayResponse,
  CreatedAt,
  UpdatedAt,
}

#[derive(DeriveIden)]
enum Bookings {
  Table,
  Id,
}
