# =============================================================================
# Data Sources - Read Existing Repository
# =============================================================================

data "github_repository" "this" {
  name = var.repository_name
}

# =============================================================================
# Branch Protection
# =============================================================================

resource "github_branch_protection" "main" {
  repository_id  = data.github_repository.this.node_id
  pattern        = var.default_branch
  enforce_admins = true

  required_status_checks {
    strict = false
  }

  # Single developer - no PR review required
  required_pull_request_reviews {
    required_approving_review_count = 0
    dismiss_stale_reviews           = true
  }

  allows_deletions    = false
  allows_force_pushes = false
  lock_branch         = false
}

# =============================================================================
# Actions Permissions
# =============================================================================

resource "github_actions_repository_permissions" "this" {
  repository      = var.repository_name
  allowed_actions = "all"
}

# =============================================================================
# Repository Topics
# =============================================================================

resource "github_repository_topics" "this" {
  repository = var.repository_name
  topics     = ["camino-santiago", "albergue", "hospitality", "booking-system", "spin", "fermyon", "wasm"]
}
