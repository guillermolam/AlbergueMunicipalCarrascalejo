# =============================================================================
# Terraform Cloud Workspace Configuration
# =============================================================================

data "tfe_organization" "this" {
  name = "albergue-elcarrascalejo"
}

resource "tfe_workspace" "this" {
  name         = "AlbergueMunicipalCarrascalejo"
  organization = data.tfe_organization.this.name

  description = "IaC for Albergue Municipal Carrascalejo - Camino de Santiago hostel"
  auto_apply  = false

  working_directory = "infra"

  vcs_repo {
    identifier                 = "${var.github_owner}/${var.repository_name}"
    github_app_installation_id = "ghain-MPdpYNHp9YEBQTMP"
  }

  terraform_version = ">= 1.0"

  lifecycle {
    prevent_destroy = true
  }
}

resource "tfe_workspace_settings" "this" {
  workspace_id   = tfe_workspace.this.id
  execution_mode = "remote"
}

# =============================================================================
# Workspace Variables - Provider Credentials
# =============================================================================

resource "tfe_variable" "github_token" {
  key          = "github_token"
  value        = var.github_token
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "GitHub PAT for provider authentication"
}

resource "tfe_variable" "tfe_token" {
  key          = "tfe_token"
  value        = var.tfe_token
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "TFC API token"
}

resource "tfe_variable" "neon_api_key" {
  key          = "neon_api_key"
  value        = var.neon_api_key
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Neon PostgreSQL API key"
}

resource "tfe_variable" "turso_api_token" {
  key          = "turso_api_token"
  value        = var.turso_api_token
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Turso database API token"
}

resource "tfe_variable" "cloudflare_api_key" {
  key          = "cloudflare_api_key"
  value        = var.cloudflare_api_key
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Cloudflare Global API Key"
}

resource "tfe_variable" "cloudflare_email" {
  key          = "cloudflare_email"
  value        = var.cloudflare_email
  category     = "terraform"
  sensitive    = false
  workspace_id = tfe_workspace.this.id
  description  = "Cloudflare account email"
}

resource "tfe_variable" "rediscloud_api_key" {
  key          = "rediscloud_api_key"
  value        = var.rediscloud_api_key
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Redis Cloud API key"
}

resource "tfe_variable" "rediscloud_secret_key" {
  key          = "rediscloud_secret_key"
  value        = var.rediscloud_secret_key
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Redis Cloud secret key"
}

resource "tfe_variable" "fermyon_cloud_token" {
  key          = "fermyon_cloud_token"
  value        = var.fermyon_cloud_token
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Fermyon Cloud deployment token"
}

# =============================================================================
# Workspace Variables - Application Config
# =============================================================================

resource "tfe_variable" "mqtt_host" {
  key          = "mqtt_host"
  value        = var.mqtt_host
  category     = "terraform"
  workspace_id = tfe_workspace.this.id
  description  = "HiveMQ MQTT broker host"
}

resource "tfe_variable" "mqtt_password" {
  key          = "mqtt_password"
  value        = var.mqtt_password
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "HiveMQ MQTT password"
}

resource "tfe_variable" "encryption_key" {
  key          = "encryption_key"
  value        = var.encryption_key
  category     = "terraform"
  sensitive    = true
  workspace_id = tfe_workspace.this.id
  description  = "Application encryption key for PII"
}
