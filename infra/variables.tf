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

variable "tfe_token" {
  description = "Terraform Cloud token"
  type        = string
  sensitive   = true
}
