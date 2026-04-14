output "database_id" {
  description = "Turso database ID"
  value       = turso_database.bookings.id
}

output "database_url" {
  description = "Turso database connection URL"
  value       = "libsql://${var.database_name}-guillermolam.${var.primary_location}.turso.io"
}

output "group_name" {
  description = "Turso group name"
  value       = turso_group.app.name
}
