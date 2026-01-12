use sea_orm_migration::{prelude::*, sea_orm::Database};

#[tokio::main]
async fn main() -> Result<(), DbErr> {
  let mut args = std::env::args().skip(1);
  let command = match args.next() {
    Some(c) => c,
    None => {
      eprintln!("usage: albergue-migration <up|down|status|fresh|refresh|reset> [-n N] [-u DATABASE_URL]");
      std::process::exit(2);
    }
  };

  let mut n: Option<u32> = None;
  let mut database_url: Option<String> = None;
  while let Some(flag) = args.next() {
    match flag.as_str() {
      "-n" => {
        if let Some(value) = args.next() {
          n = value.parse::<u32>().ok();
        }
      }
      "-u" | "--database-url" => {
        database_url = args.next();
      }
      _ => {}
    }
  }

  let database_url = database_url
    .or_else(|| std::env::var("DATABASE_URL").ok())
    .unwrap_or_else(|| "sqlite://albergue.db".to_owned());

  if let Some(path) = database_url.strip_prefix("sqlite://") {
    if !path.is_empty() && path != ":memory:" && !path.starts_with(':') && !path.contains('?') {
      let _ = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .open(path);
    }
  }

  let db = Database::connect(&database_url).await?;

  match command.as_str() {
    "up" => {
      albergue_migration::Migrator::up(&db, n).await?;
    }
    "down" => {
      albergue_migration::Migrator::down(&db, n).await?;
    }
    "status" => {
      let applied = albergue_migration::Migrator::get_applied_migrations(&db).await?;
      for m in applied {
        println!("{}\tApplied", m.name());
      }

      let pending = albergue_migration::Migrator::get_pending_migrations(&db).await?;
      for m in pending {
        println!("{}\tPending", m.name());
      }
    }
    "fresh" => {
      albergue_migration::Migrator::fresh(&db).await?;
    }
    "refresh" => {
      albergue_migration::Migrator::refresh(&db).await?;
    }
    "reset" => {
      albergue_migration::Migrator::reset(&db).await?;
    }
    _ => {
      eprintln!("unknown command: {command}");
      std::process::exit(2);
    }
  }

  Ok(())
}
