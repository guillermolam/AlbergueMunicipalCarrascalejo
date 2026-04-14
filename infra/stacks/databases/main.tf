module "turso" {
  source = "../../modules/turso-database"

  group_name       = "alberguecarrascalejo-app-db"
  primary_location = "aws-eu-west-1"
  database_name    = "bookings"
}

# Neon is manually managed (API key restrictions). Reference outputs only.
output "neon_project_id" {
  description = "Neon project ID (manually managed — not in Terraform state)"
  value       = "rapid-poetry-82725286"
}

output "turso_database_id" { value = module.turso.database_id }
output "turso_database_url" { value = module.turso.database_url }
