use albergue_migration::Migrator;
use sea_orm_migration::prelude::*;
use sea_orm_migration::sea_orm::Database;

#[tokio::test]
async fn migrations_apply_and_report_status() -> Result<(), DbErr> {
  let db = Database::connect("sqlite::memory:").await?;

  Migrator::refresh(&db).await?;
  let applied = Migrator::get_applied_migrations(&db).await?;
  let pending = Migrator::get_pending_migrations(&db).await?;
  assert_eq!(applied.len(), 10);
  assert_eq!(pending.len(), 0);

  Migrator::reset(&db).await?;
  let applied = Migrator::get_applied_migrations(&db).await?;
  let pending = Migrator::get_pending_migrations(&db).await?;
  assert_eq!(applied.len(), 0);
  assert_eq!(pending.len(), 10);

  Ok(())
}
