variable "account_id" {
  type        = string
  description = "Cloudflare account ID"
  nullable    = false
}

variable "project_name" {
  type        = string
  description = "Cloudflare Pages project name (slug)"
  default     = "albergue-carrascalejo"
}

variable "production_branch" {
  type        = string
  description = "Git branch that triggers production deployments"
  default     = "main"
}

variable "github_owner" {
  type        = string
  description = "GitHub username or org that owns the repository"
  default     = "guillermolam"
}

variable "repository_name" {
  type        = string
  description = "GitHub repository name"
  default     = "AlbergueMunicipalCarrascalejo"
}

variable "geoapify_api_key" {
  type        = string
  description = "Geoapify API key for address autocomplete"
  sensitive   = true
  default     = ""
}

variable "api_service_token" {
  type        = string
  description = "Shared token for Astro SSR → Rust gateway auth"
  sensitive   = true
  default     = ""
}

variable "compatibility_date" {
  type        = string
  description = "Cloudflare Workers compatibility date"
  default     = "2025-05-21"
}

variable "preview_branches" {
  type        = list(string)
  description = "Git branches that get preview deployments"
  default     = ["develop", "staging"]
}
