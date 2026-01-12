use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(GovernmentSubmissions::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(GovernmentSubmissions::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(GovernmentSubmissions::BookingId).integer().not_null())
          .col(ColumnDef::new(GovernmentSubmissions::XmlContent).text().not_null())
          .col(ColumnDef::new(GovernmentSubmissions::SubmissionStatus).string().null())
          .col(ColumnDef::new(GovernmentSubmissions::ResponseData).json().null())
          .col(ColumnDef::new(GovernmentSubmissions::Attempts).integer().null())
          .col(ColumnDef::new(GovernmentSubmissions::LastAttempt).timestamp().null())
          .col(ColumnDef::new(GovernmentSubmissions::CreatedAt).timestamp().null())
          .foreign_key(
            ForeignKey::create()
              .name("fk_government_submissions_booking")
              .from(GovernmentSubmissions::Table, GovernmentSubmissions::BookingId)
              .to(Bookings::Table, Bookings::Id),
          )
          .to_owned(),
      )
      .await
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(
        Table::drop()
          .table(GovernmentSubmissions::Table)
          .if_exists()
          .to_owned(),
      )
      .await
  }
}

#[derive(DeriveIden)]
enum GovernmentSubmissions {
  Table,
  Id,
  BookingId,
  XmlContent,
  SubmissionStatus,
  ResponseData,
  Attempts,
  LastAttempt,
  CreatedAt,
}

#[derive(DeriveIden)]
enum Bookings {
  Table,
  Id,
}
