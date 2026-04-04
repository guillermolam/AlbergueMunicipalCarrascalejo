# =============================================================================
# Turso Database (SQLite - Primary Production Database)
# =============================================================================

resource "turso_group" "app" {
  name      = "alberguecarrascalejo-app-db"
  primary   = "aws-eu-west-1"
  locations = ["aws-eu-west-1"]
}

resource "turso_database" "bookings" {
  name  = "bookings"
  group = turso_group.app.name
}

# =============================================================================
# Outputs
# =============================================================================

output "turso_database_url" {
  description = "Turso database connection URL"
  value       = "libsql://bookings-guillermolam.aws-eu-west-1.turso.io"
}

output "turso_database_id" {
  description = "Turso database ID"
  value       = turso_database.bookings.id
}
