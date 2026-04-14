variable "github_owner" {
  type    = string
  default = "guillermolam"
}

variable "github_token" {
  type      = string
  sensitive = true
}

variable "repository_name" {
  type    = string
  default = "AlbergueMunicipalCarrascalejo"
}

variable "default_branch" {
  type    = string
  default = "main"
}

variable "fermyon_cloud_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "neon_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "spacelift_api_token" {
  type        = string
  sensitive   = true
  description = "Spacelift API token stored as GitHub Actions secret"
  default     = ""
}

variable "spacelift_api_endpoint" {
  type    = string
  default = "https://guillermolam.app.spacelift.io"
}

variable "spacelift_api_key_id" {
  type      = string
  sensitive = true
}

variable "spacelift_api_key_secret" {
  type      = string
  sensitive = true
}
