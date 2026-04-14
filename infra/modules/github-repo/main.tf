# =============================================================================
# GitHub Repository Settings, Branch Protection, Environments & Secrets
# =============================================================================

resource "github_repository" "this" {
  name        = var.repository_name
  description = "Web de reservas del albergue municipal de El Carrascalejo"
  visibility  = "public"

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = false

  allow_squash_merge     = true
  allow_merge_commit     = true
  allow_rebase_merge     = true
  delete_branch_on_merge = false

  vulnerability_alerts = true

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }

  pages {
    build_type = "workflow"
  }

  topics = ["camino-santiago", "albergue", "hospitality", "booking-system", "spin", "fermyon", "wasm"]

  lifecycle {
    prevent_destroy = true
  }
}

resource "github_branch_protection" "main" {
  repository_id  = github_repository.this.node_id
  pattern        = var.default_branch
  enforce_admins = true

  required_status_checks {
    strict = false
  }

  required_pull_request_reviews {
    required_approving_review_count = 0
    dismiss_stale_reviews           = true
  }

  allows_deletions    = false
  allows_force_pushes = false
  lock_branch         = false
}

resource "github_actions_repository_permissions" "this" {
  repository      = github_repository.this.name
  allowed_actions = "all"
}

resource "github_repository_environment" "production" {
  environment = "Production"
  repository  = github_repository.this.name

  deployment_branch_policy {
    protected_branches     = true
    custom_branch_policies = false
  }
}

resource "github_repository_environment" "github_pages" {
  environment = "github-pages"
  repository  = github_repository.this.name
}

resource "github_actions_secret" "fermyon_cloud_token" {
  repository      = github_repository.this.name
  secret_name     = "FERMYON_CLOUD_TOKEN"
  plaintext_value = var.fermyon_cloud_token
}

resource "github_actions_secret" "neon_api_key" {
  repository      = github_repository.this.name
  secret_name     = "NEON_API_KEY"
  plaintext_value = var.neon_api_key
}

resource "github_actions_secret" "spacelift_api_token" {
  repository      = github_repository.this.name
  secret_name     = "SPACELIFT_API_TOKEN"
  plaintext_value = var.spacelift_api_token
}

resource "github_actions_variable" "neon_project_id" {
  repository    = github_repository.this.name
  variable_name = "NEON_PROJECT_ID"
  value         = var.neon_project_id
}

resource "github_repository_dependabot_security_updates" "this" {
  repository = github_repository.this.name
  enabled    = true
}
