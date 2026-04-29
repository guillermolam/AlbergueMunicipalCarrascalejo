variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Scoped CF API token: Pages + KV + D1" #kics-scan ignore-line
}

variable "cloudflare_account_id" {
  type    = string
  default = "798e36259a38e6217cc9987ce0bf1316"
}

variable "geoapify_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "api_service_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "github_owner" {
  type    = string
  default = "guillermolam"
}

variable "repository_name" {
  type    = string
  default = "AlbergueMunicipalCarrascalejo"
}

variable "default_branch" {
  type    = string
  default = "main"
}
