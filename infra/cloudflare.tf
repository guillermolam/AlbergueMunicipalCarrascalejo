# =============================================================================
# Cloudflare Pages (Frontend Hosting - Free Tier)
# =============================================================================

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "albergue-carrascalejo"
  production_branch = var.default_branch

  build_config = {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = "frontend"
  }

  source = {
    type = "github"

    config = {
      owner                         = var.github_owner
      repo_name                     = var.repository_name
      production_branch             = var.default_branch
      deployments_enabled           = true
      pr_comments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "custom"
      preview_branch_includes       = ["develop", "staging"]
    }
  }

  deployment_configs = {
    production = {
      environment_variables = {
        NODE_VERSION   = "20"
        PUBLIC_API_URL = "https://albergue-carrascalejo-v99ew1nt.fermyon.app/api"
      }
      compatibility_date = "2024-01-01"
    }

    preview = {
      environment_variables = {
        NODE_VERSION   = "20"
        PUBLIC_API_URL = "https://albergue-carrascalejo-v99ew1nt.fermyon.app/api"
      }
      compatibility_date = "2024-01-01"
    }
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "cloudflare_pages_url" {
  description = "Cloudflare Pages deployment URL"
  value       = cloudflare_pages_project.frontend.subdomain
}
