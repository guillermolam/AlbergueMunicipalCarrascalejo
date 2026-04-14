resource "turso_group" "app" {
  name      = var.group_name
  primary   = var.primary_location
  locations = concat([var.primary_location], var.replica_locations)
}

resource "turso_database" "bookings" {
  name  = var.database_name
  group = turso_group.app.name
}
