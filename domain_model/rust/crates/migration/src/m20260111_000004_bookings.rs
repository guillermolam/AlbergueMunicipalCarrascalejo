use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(Bookings::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(Bookings::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(Bookings::PilgrimId).integer().not_null())
          .col(
            ColumnDef::new(Bookings::ReferenceNumber)
              .string()
              .not_null()
              .unique_key(),
          )
          .col(ColumnDef::new(Bookings::CheckInDate).date().not_null())
          .col(ColumnDef::new(Bookings::CheckOutDate).date().not_null())
          .col(ColumnDef::new(Bookings::NumberOfNights).integer().not_null())
          .col(ColumnDef::new(Bookings::NumberOfPersons).integer().null())
          .col(ColumnDef::new(Bookings::NumberOfRooms).integer().null())
          .col(ColumnDef::new(Bookings::HasInternet).boolean().null())
          .col(ColumnDef::new(Bookings::Status).string().null())
          .col(ColumnDef::new(Bookings::BedAssignmentId).integer().null())
          .col(ColumnDef::new(Bookings::EstimatedArrivalTime).string().null())
          .col(ColumnDef::new(Bookings::Notes).text().null())
          .col(ColumnDef::new(Bookings::TotalAmount).decimal_len(10, 2).not_null())
          .col(ColumnDef::new(Bookings::ReservationExpiresAt).timestamp().not_null())
          .col(ColumnDef::new(Bookings::PaymentDeadline).timestamp().not_null())
          .col(ColumnDef::new(Bookings::AutoCleanupProcessed).boolean().null())
          .col(ColumnDef::new(Bookings::CreatedAt).timestamp().null())
          .col(ColumnDef::new(Bookings::UpdatedAt).timestamp().null())
          .foreign_key(
            ForeignKey::create()
              .name("fk_bookings_pilgrim")
              .from(Bookings::Table, Bookings::PilgrimId)
              .to(Pilgrims::Table, Pilgrims::Id),
          )
          .foreign_key(
            ForeignKey::create()
              .name("fk_bookings_bed")
              .from(Bookings::Table, Bookings::BedAssignmentId)
              .to(Beds::Table, Beds::Id),
          )
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_bookings_status")
          .table(Bookings::Table)
          .col(Bookings::Status)
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_bookings_reservation_expires_at")
          .table(Bookings::Table)
          .col(Bookings::ReservationExpiresAt)
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(Bookings::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum Bookings {
  Table,
  Id,
  PilgrimId,
  ReferenceNumber,
  CheckInDate,
  CheckOutDate,
  NumberOfNights,
  NumberOfPersons,
  NumberOfRooms,
  HasInternet,
  Status,
  BedAssignmentId,
  EstimatedArrivalTime,
  Notes,
  TotalAmount,
  ReservationExpiresAt,
  PaymentDeadline,
  AutoCleanupProcessed,
  CreatedAt,
  UpdatedAt,
}

#[derive(DeriveIden)]
enum Pilgrims {
  Table,
  Id,
}

#[derive(DeriveIden)]
enum Beds {
  Table,
  Id,
}
