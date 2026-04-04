provider "tfe" {
  token = var.tfe_token
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

provider "cloudflare" {
  api_key = var.cloudflare_api_key
  email   = var.cloudflare_email
}

provider "neon" {
  token = var.neon_api_key
}

provider "turso" {
  api_token    = var.turso_api_token
  organization = "guillermolam"
}

provider "rediscloud" {
  api_key    = var.rediscloud_api_key
  secret_key = var.rediscloud_secret_key
}
