# =============================================================================
# State Imports - Import existing resources into Terraform state
# Remove this file after successful apply.
# =============================================================================

# --- GitHub Repository ---
import {
  to = github_repository.this
  id = "AlbergueMunicipalCarrascalejo"
}

# --- GitHub Actions Permissions ---
import {
  to = github_actions_repository_permissions.this
  id = "AlbergueMunicipalCarrascalejo"
}

# --- GitHub Environments ---
import {
  to = github_repository_environment.production
  id = "AlbergueMunicipalCarrascalejo:Production"
}

import {
  to = github_repository_environment.github_pages
  id = "AlbergueMunicipalCarrascalejo:github-pages"
}

# --- GitHub Actions Secrets (format: repo:secret_name) ---
import {
  to = github_actions_secret.fermyon_cloud_token
  id = "AlbergueMunicipalCarrascalejo:FERMYON_CLOUD_TOKEN"
}

import {
  to = github_actions_secret.neon_api_key
  id = "AlbergueMunicipalCarrascalejo:NEON_API_KEY"
}

import {
  to = github_actions_secret.tf_api_token
  id = "AlbergueMunicipalCarrascalejo:TF_API_TOKEN"
}

import {
  to = github_actions_secret.tf_org
  id = "AlbergueMunicipalCarrascalejo:TF_ORG"
}

import {
  to = github_actions_secret.tf_workspace
  id = "AlbergueMunicipalCarrascalejo:TF_WORKSPACE"
}

# --- GitHub Actions Variable ---
import {
  to = github_actions_variable.neon_project_id
  id = "AlbergueMunicipalCarrascalejo:NEON_PROJECT_ID"
}

# --- GitHub Dependabot ---
import {
  to = github_repository_dependabot_security_updates.this
  id = "AlbergueMunicipalCarrascalejo"
}

# --- TFC Workspace ---
import {
  to = tfe_workspace.this
  id = "ws-b8pqaRifqBYdnRbn"
}

# --- TFC Variables (format: org/workspace_name/var_id) ---
import {
  to = tfe_variable.tfe_token
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-2W6qkDb5dU5dJebH"
}

import {
  to = tfe_variable.github_token
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-S1q7tojVdEe7LD8h"
}

import {
  to = tfe_variable.neon_api_key
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-gpP9rWPoA2RaZviR"
}

import {
  to = tfe_variable.turso_api_token
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-LSHwBVF7zBZN9dsH"
}

import {
  to = tfe_variable.cloudflare_api_key
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-ArTKe94sZRaBewua"
}

import {
  to = tfe_variable.cloudflare_email
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-dap7Dtyqd45m7pWc"
}

import {
  to = tfe_variable.rediscloud_api_key
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-2R34orZTjkN87kmv"
}

import {
  to = tfe_variable.rediscloud_secret_key
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-ZvQ9RWh714WdupXZ"
}

import {
  to = tfe_variable.fermyon_cloud_token
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-aLHoVjTTZxncpCV8"
}

import {
  to = tfe_variable.mqtt_host
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-D6TPMJnTdPzUzkxc"
}

import {
  to = tfe_variable.mqtt_password
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-b437Z8aaBt99A6A8"
}

import {
  to = tfe_variable.encryption_key
  id = "albergue-elcarrascalejo/AlbergueMunicipalCarrascalejo/var-Nejag9hDH6bCf1EM"
}

# --- Turso (group + database) ---
import {
  to = turso_group.app
  id = "alberguecarrascalejo-app-db"
}

import {
  to = turso_database.bookings
  id = "bookings"
}

# --- Neon ---
import {
  to = neon_project.this
  id = "rapid-poetry-82725286"
}
