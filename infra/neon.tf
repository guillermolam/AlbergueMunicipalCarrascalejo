# =============================================================================
# Neon PostgreSQL (Serverless - Dev/Test Database, Free Tier)
# =============================================================================

resource "neon_project" "this" {
  name      = "maisa-neondbs"
  region_id = "aws-eu-central-1"

  branch = {
    name = "production"
  }

  pg_version        = 17
  history_retention = 21600
  org_id            = "org-odd-mouse-71740473"
}

# =============================================================================
# Outputs
# =============================================================================

output "neon_project_id" {
  description = "Neon project ID"
  value       = neon_project.this.id
}
