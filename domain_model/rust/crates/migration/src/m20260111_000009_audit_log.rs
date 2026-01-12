use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .create_table(
        Table::create()
          .table(AuditLog::Table)
          .if_not_exists()
          .col(
            ColumnDef::new(AuditLog::Id)
              .integer()
              .not_null()
              .primary_key()
              .auto_increment(),
          )
          .col(ColumnDef::new(AuditLog::TableName).string().not_null())
          .col(ColumnDef::new(AuditLog::RecordId).string().not_null())
          .col(ColumnDef::new(AuditLog::Action).string().not_null())
          .col(ColumnDef::new(AuditLog::OldValues).json().null())
          .col(ColumnDef::new(AuditLog::NewValues).json().null())
          .col(ColumnDef::new(AuditLog::UserId).integer().null())
          .col(ColumnDef::new(AuditLog::IpAddress).string().null())
          .col(ColumnDef::new(AuditLog::UserAgent).text().null())
          .col(ColumnDef::new(AuditLog::CreatedAt).timestamp().null())
          .foreign_key(
            ForeignKey::create()
              .name("fk_audit_log_user")
              .from(AuditLog::Table, AuditLog::UserId)
              .to(Users::Table, Users::Id),
          )
          .to_owned(),
      )
      .await?;

    manager
      .create_index(
        Index::create()
          .name("idx_audit_log_record")
          .table(AuditLog::Table)
          .col(AuditLog::TableName)
          .col(AuditLog::RecordId)
          .to_owned(),
      )
      .await?;

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    manager
      .drop_table(Table::drop().table(AuditLog::Table).if_exists().to_owned())
      .await
  }
}

#[derive(DeriveIden)]
enum AuditLog {
  Table,
  Id,
  TableName,
  RecordId,
  Action,
  OldValues,
  NewValues,
  UserId,
  IpAddress,
  UserAgent,
  CreatedAt,
}

#[derive(DeriveIden)]
enum Users {
  Table,
  Id,
}
