# =============================================================================
# General
# =============================================================================

variable "repository_name" {
  description = "Name of the repository"
  type        = string
  default     = "AlbergueMunicipalCarrascalejo"
}

variable "default_branch" {
  description = "Default branch name"
  type        = string
  default     = "main"
}

variable "project_name" {
  description = "Human-readable project name"
  type        = string
  default     = "Albergue Municipal Carrascalejo"
}

# =============================================================================
# Provider Credentials (sensitive - set in TFC workspace variables)
# =============================================================================

variable "tfe_token" {
  description = "Terraform Cloud API token"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization or user"
  type        = string
  default     = "guillermolam"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token (scoped, created at dash.cloudflare.com/profile/api-tokens)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "798e36259a38e6217cc9987ce0bf1316"
}

variable "neon_api_key" {
  description = "Neon PostgreSQL API key"
  type        = string
  sensitive   = true
}

variable "turso_api_token" {
  description = "Turso API token"
  type        = string
  sensitive   = true
}

variable "rediscloud_api_key" {
  description = "Redis Cloud API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "rediscloud_secret_key" {
  description = "Redis Cloud secret key"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# Application Secrets (stored in TFC, passed to Spin/services)
# =============================================================================

variable "fermyon_cloud_token" {
  description = "Fermyon Cloud deployment token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "mqtt_host" {
  description = "HiveMQ Cloud MQTT host"
  type        = string
  default     = "4daf0d9c7c5f4112a62ec2f01b94518d.s1.eu.hivemq.cloud"
}

variable "mqtt_port" {
  description = "HiveMQ Cloud MQTT port"
  type        = number
  default     = 8883
}

variable "mqtt_username" {
  description = "HiveMQ Cloud MQTT username"
  type        = string
  default     = "alberguecarrascalejo_hive"
}

variable "mqtt_password" {
  description = "HiveMQ Cloud MQTT password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "encryption_key" {
  description = "Application-level encryption key for PII"
  type        = string
  sensitive   = true
  default     = ""
}

variable "geoapify_api_key" {
  description = "Geoapify API key for address autocomplete (stored as CF Pages secret)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "api_service_token" {
  description = "Shared token for Astro SSR → Rust gateway authentication"
  type        = string
  sensitive   = true
  default     = ""
}
