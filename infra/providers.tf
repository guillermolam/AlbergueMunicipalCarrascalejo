provider "tfe" {
  token = var.tfe_token
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

# Cloudflare - scoped API Token required.
# Create at: dash.cloudflare.com/profile/api-tokens
# Template: "Edit Cloudflare Pages" + add Workers KV Storage:Edit + D1:Edit scopes.
# Set cloudflare_api_token as a sensitive variable in the TFC workspace.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Neon - needs org-level API key with project access
# provider "neon" {
#   token = var.neon_api_key
# }

provider "turso" {
  api_token    = var.turso_api_token
  organization = "guillermolam"
}

# rediscloud - requires paid plan for API access (free tier has no API keys)
# provider "rediscloud" {
#   api_key    = var.rediscloud_api_key
#   secret_key = var.rediscloud_secret_key
# }
