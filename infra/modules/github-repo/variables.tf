variable "repository_name" {
  type        = string
  description = "GitHub repository name"
  default     = "AlbergueMunicipalCarrascalejo"
}

variable "default_branch" {
  type        = string
  description = "Default/production branch"
  default     = "main"
}

variable "fermyon_cloud_token" {
  type        = string
  description = "Fermyon Cloud deployment token (Actions secret)"
  sensitive   = true
  default     = ""
}

variable "neon_api_key" {
  type        = string
  description = "Neon PostgreSQL API key (Actions secret)"
  sensitive   = true
  default     = ""
}

variable "spacelift_api_token" {
  type        = string
  description = "Spacelift API token for CI workflows (replaces TF_API_TOKEN)"
  sensitive   = true
  default     = ""
}

variable "neon_project_id" {
  type        = string
  description = "Neon project ID (Actions variable)"
  default     = "rapid-poetry-82725286"
}
