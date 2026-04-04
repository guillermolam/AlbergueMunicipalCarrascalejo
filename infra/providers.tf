provider "tfe" {
  token = var.tfe_token
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}
