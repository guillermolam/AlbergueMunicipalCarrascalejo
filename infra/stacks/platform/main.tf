module "github_repo" {
  source = "../../modules/github-repo"

  repository_name     = var.repository_name
  default_branch      = var.default_branch
  fermyon_cloud_token = var.fermyon_cloud_token
  neon_api_key        = var.neon_api_key
  spacelift_api_token = var.spacelift_api_token
}
