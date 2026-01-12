use bytes::Bytes;
use libsql::{Cipher, EncryptionConfig};

fn split_sql_statements(sql: &str) -> Vec<String> {
  let mut statements = Vec::new();
  let mut current = String::new();
  let mut in_single_quote = false;
  let mut in_double_quote = false;

  for c in sql.chars() {
    match c {
      '\'' if !in_double_quote => {
        in_single_quote = !in_single_quote;
        current.push(c);
      }
      '"' if !in_single_quote => {
        in_double_quote = !in_double_quote;
        current.push(c);
      }
      ';' if !in_single_quote && !in_double_quote => {
        let trimmed = current.trim();
        if !trimmed.is_empty() {
          statements.push(trimmed.to_owned());
        }
        current.clear();
      }
      _ => current.push(c),
    }
  }

  let trimmed = current.trim();
  if !trimmed.is_empty() {
    statements.push(trimmed.to_owned());
  }

  statements
}

async fn exec_sql(conn: &libsql::Connection, sql: &str) -> Result<(), libsql::Error> {
  for stmt in split_sql_statements(sql) {
    conn.execute(&stmt, ()).await?;
  }
  Ok(())
}

const BASELINE_MIGRATION_NAME: &str = "m20260111_000000_baseline";
const BASELINE_SQL: &str = include_str!("../sql/baseline_libsql.sql");

#[tokio::main]
async fn main() {
  tracing_subscriber::fmt()
    .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
    .init();

  let mut args = std::env::args().skip(1);
  let command = args.next().unwrap_or_else(|| "sync".to_owned());

  match command.as_str() {
    "sync" => {
      let mut interval_secs: Option<u64> = None;
      while let Some(flag) = args.next() {
        match flag.as_str() {
          "--interval-secs" => {
            if let Some(v) = args.next() {
              interval_secs = v.parse::<u64>().ok();
            }
          }
          _ => {}
        }
      }

      let database_url = std::env::var("DATABASE_URL").expect("missing DATABASE_URL");
      let token = std::env::var("TURSO_AUTH_TOKEN").expect("missing TURSO_AUTH_TOKEN");
      let replica_path =
        std::env::var("TURSO_REPLICA_PATH").unwrap_or_else(|_| "albergue.local.db".to_owned());

      let encryption_config = std::env::var("TURSO_ENCRYPTION_KEY").ok().map(|key| {
        let cipher = std::env::var("TURSO_ENCRYPTION_CIPHER")
          .ok()
          .and_then(|s| s.parse::<Cipher>().ok())
          .unwrap_or_default();

        EncryptionConfig {
          cipher,
          encryption_key: Bytes::from(key.into_bytes()),
        }
      });

      let mut builder = libsql::Builder::new_remote_replica(replica_path.clone(), database_url, token);
      if let Some(cfg) = encryption_config {
        builder = builder.encryption_config(cfg);
      }
      if let Some(s) = interval_secs.filter(|s| *s > 0) {
        builder = builder.sync_interval(std::time::Duration::from_secs(s));
      }

      let db = builder.build().await.expect("failed to create libsql replica");
      db.sync().await.expect("failed to sync libsql replica");
      tracing::info!(replica_path = replica_path, "turso replica synced");

      if interval_secs.unwrap_or(0) > 0 {
        let _ = tokio::signal::ctrl_c().await;
      }
    }
    "migrate-remote" => {
      let database_url = std::env::var("DATABASE_URL").expect("missing DATABASE_URL");
      let token = std::env::var("TURSO_AUTH_TOKEN").expect("missing TURSO_AUTH_TOKEN");

      let db = libsql::Builder::new_remote(database_url, token)
        .build()
        .await
        .expect("failed to connect to remote turso");
      let conn = db.connect().expect("failed to connect");

      conn
        .execute(
          "CREATE TABLE IF NOT EXISTS _albergue_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP))",
          (),
        )
        .await
        .expect("failed to create migrations table");

      let mut rows = conn
        .query(
          "SELECT 1 FROM _albergue_migrations WHERE name = ? LIMIT 1",
          [BASELINE_MIGRATION_NAME],
        )
        .await
        .expect("failed to query migrations table");

      if rows.next().await.expect("row error").is_some() {
        tracing::info!(migration = BASELINE_MIGRATION_NAME, "migration already applied");
        return;
      }

      conn.execute("BEGIN", ()).await.expect("begin failed");
      if let Err(e) = exec_sql(&conn, BASELINE_SQL).await {
        let _ = conn.execute("ROLLBACK", ()).await;
        panic!("migration failed: {e}");
      }

      if let Err(e) = conn
        .execute(
          "INSERT INTO _albergue_migrations (name) VALUES (?)",
          [BASELINE_MIGRATION_NAME],
        )
        .await
      {
        let _ = conn.execute("ROLLBACK", ()).await;
        panic!("failed to record migration: {e}");
      }

      conn.execute("COMMIT", ()).await.expect("commit failed");
      tracing::info!(migration = BASELINE_MIGRATION_NAME, "migration applied");
    }
    "status-remote" => {
      let database_url = std::env::var("DATABASE_URL").expect("missing DATABASE_URL");
      let token = std::env::var("TURSO_AUTH_TOKEN").expect("missing TURSO_AUTH_TOKEN");

      let db = libsql::Builder::new_remote(database_url, token)
        .build()
        .await
        .expect("failed to connect to remote turso");
      let conn = db.connect().expect("failed to connect");

      conn
        .execute(
          "CREATE TABLE IF NOT EXISTS _albergue_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP))",
          (),
        )
        .await
        .expect("failed to create migrations table");

      let mut rows = conn
        .query(
          "SELECT 1 FROM _albergue_migrations WHERE name = ? LIMIT 1",
          [BASELINE_MIGRATION_NAME],
        )
        .await
        .expect("failed to query migrations table");

      let applied = rows.next().await.expect("row error").is_some();
      if applied {
        println!("{BASELINE_MIGRATION_NAME}\tApplied");
      } else {
        println!("{BASELINE_MIGRATION_NAME}\tPending");
      }
    }
    _ => {
      eprintln!("usage: albergue-turso-sync <sync|migrate-remote|status-remote> [--interval-secs N]");
      std::process::exit(2);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[tokio::test]
  async fn baseline_creates_expected_tables() -> Result<(), libsql::Error> {
    let db = libsql::Builder::new_local(":memory:").build().await?;
    let conn = db.connect()?;
    exec_sql(&conn, BASELINE_SQL).await?;

    let mut rows = conn
      .query("SELECT name FROM sqlite_master WHERE type='table'", ())
      .await?;
    let mut names = std::collections::HashSet::new();
    while let Some(row) = rows.next().await? {
      let name: String = row.get(0)?;
      names.insert(name);
    }

    for expected in [
      "users",
      "pilgrims",
      "beds",
      "bookings",
      "payments",
      "pricing",
      "government_submissions",
      "notifications",
      "audit_log",
    ] {
      assert!(names.contains(expected), "missing table: {expected}");
    }

    Ok(())
  }

  #[tokio::test]
  async fn encrypted_db_fails_without_key() -> Result<(), libsql::Error> {
    let tmp = std::env::temp_dir();
    let path = tmp.join(format!(
      "albergue_libsql_encrypted_{}.db",
      std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos()
    ));
    let path_str = path.to_string_lossy().to_string();

    let encryption_config = EncryptionConfig {
      cipher: Cipher::Aes256Cbc,
      encryption_key: Bytes::from("test_encryption_key"),
    };

    let db = libsql::Builder::new_local(path_str.clone())
      .encryption_config(encryption_config)
      .build()
      .await?;
    let conn = db.connect()?;
    conn
      .execute("CREATE TABLE IF NOT EXISTS t (id INTEGER)", ())
      .await?;

    drop(conn);
    drop(db);

    let db_without_key = libsql::Builder::new_local(path_str).build().await?;
    let conn_without_key = db_without_key.connect()?;
    let result = conn_without_key.execute("SELECT 1", ()).await;
    assert!(result.is_err());

    Ok(())
  }
}
