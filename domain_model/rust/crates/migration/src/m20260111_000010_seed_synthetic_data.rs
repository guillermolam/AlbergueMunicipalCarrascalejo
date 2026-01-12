use sea_orm_migration::{
  prelude::*,
  sea_orm::ConnectionTrait,
};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
  async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    let db = manager.get_connection();

    let exists_stmt = Query::select()
      .expr(Expr::val(1))
      .from(Alias::new("users"))
      .and_where(Expr::col(Alias::new("username")).eq("synthetic_admin"))
      .limit(1)
      .to_owned();

    let exists = db.query_one(&exists_stmt).await?.is_some();

    if !exists {
      let insert_stmt = Query::insert()
        .into_table(Alias::new("users"))
        .columns([Alias::new("username"), Alias::new("password")])
        .values_panic(["synthetic_admin".into(), "synthetic_password".into()])
        .to_owned();

      manager.exec_stmt(insert_stmt).await?;
    }

    Ok(())
  }

  async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
    let delete_stmt = Query::delete()
      .from_table(Alias::new("users"))
      .and_where(Expr::col(Alias::new("username")).eq("synthetic_admin"))
      .to_owned();

    manager.exec_stmt(delete_stmt).await?;

    Ok(())
  }
}

