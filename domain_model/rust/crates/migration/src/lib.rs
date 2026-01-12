pub use sea_orm_migration::*;

mod m20260111_000001_users;
mod m20260111_000002_pilgrims;
mod m20260111_000003_beds;
mod m20260111_000004_bookings;
mod m20260111_000005_payments;
mod m20260111_000006_pricing;
mod m20260111_000007_government_submissions;
mod m20260111_000008_notifications;
mod m20260111_000009_audit_log;
mod m20260111_000010_seed_synthetic_data;
pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
  fn migrations() -> Vec<Box<dyn MigrationTrait>> {
    vec![
      Box::new(m20260111_000001_users::Migration),
      Box::new(m20260111_000002_pilgrims::Migration),
      Box::new(m20260111_000003_beds::Migration),
      Box::new(m20260111_000004_bookings::Migration),
      Box::new(m20260111_000005_payments::Migration),
      Box::new(m20260111_000006_pricing::Migration),
      Box::new(m20260111_000007_government_submissions::Migration),
      Box::new(m20260111_000008_notifications::Migration),
      Box::new(m20260111_000009_audit_log::Migration),
      Box::new(m20260111_000010_seed_synthetic_data::Migration),
    ]
  }
}

