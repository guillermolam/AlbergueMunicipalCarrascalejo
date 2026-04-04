variable "github_token" {
  description = "GitHub personal access token"
  type        = string
  sensitive   = true
}

provider "tfe" {
  token = var.github_token
}

provider "github" {
  owner = "guillermolam"
  token = var.github_token
}
