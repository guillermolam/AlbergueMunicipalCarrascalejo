# =============================================================================
# Neon PostgreSQL (Serverless - Dev/Test Database, Free Tier)
# =============================================================================
#
# Requires org-level Neon API key with project access.
# Current key returns "user has no access to projects".
# Generate a new key at: console.neon.tech > Account > API Keys
# Then set neon_api_key in TFC and uncomment below.
# =============================================================================

# resource "neon_project" "this" {
#   name      = "maisa-neondbs"
#   region_id = "aws-eu-central-1"
#
#   branch = {
#     name = "production"
#   }
#
#   pg_version        = 17
#   history_retention = 21600
#   org_id            = "org-odd-mouse-71740473"
# }

output "neon_project_id" {
  description = "Neon project ID (manually managed)"
  value       = "rapid-poetry-82725286"
}
