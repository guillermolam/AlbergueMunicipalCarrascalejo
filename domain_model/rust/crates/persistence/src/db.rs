use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use std::time::Duration;

pub async fn connect(database_url: &str) -> Result<DatabaseConnection, sea_orm::DbErr> {
  let mut opt = ConnectOptions::new(database_url.to_owned());
  opt.max_connections(10)
    .min_connections(1)
    .connect_timeout(Duration::from_secs(10))
    .idle_timeout(Duration::from_secs(60))
    .sqlx_logging(false);
  Database::connect(opt).await
}

pub async fn connect_auto() -> Result<DatabaseConnection, sea_orm::DbErr> {
  let database_url =
    std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://albergue.db".to_owned());
  connect(&database_url).await
}
