# =============================================================================
# Globals — Shared naming conventions, tags, and constants
# Used by all stacks via: module "globals" { source = "../../globals" }
# =============================================================================

locals {
  project       = "albergue-carrascalejo"
  github_owner  = "guillermolam"
  repository    = "AlbergueMunicipalCarrascalejo"
  oci_region    = "eu-madrid-1"
  cf_account_id = "798e36259a38e6217cc9987ce0bf1316"

  common_tags = {
    "ManagedBy" = "Terraform"
    "Project"   = local.project
    "Repo"      = "${local.github_owner}/${local.repository}"
  }

  env_tags = {
    production = merge(local.common_tags, { "Environment" = "production" })
    staging    = merge(local.common_tags, { "Environment" = "staging" })
    dev        = merge(local.common_tags, { "Environment" = "dev" })
  }
}
