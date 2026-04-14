# =============================================================================
# Cloudflare Resources — KV Namespaces, D1 Database, Pages Project
# =============================================================================

resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.account_id
  title      = "${var.project_name}-cache-production"
}

resource "cloudflare_workers_kv_namespace" "cache_preview" {
  account_id = var.account_id
  title      = "${var.project_name}-cache-preview"
}

resource "cloudflare_workers_kv_namespace" "session" {
  account_id = var.account_id
  title      = "${var.project_name}-session-production"
}

resource "cloudflare_workers_kv_namespace" "session_preview" {
  account_id = var.account_id
  title      = "${var.project_name}-session-preview"
}

resource "cloudflare_d1_database" "albergue_db" {
  account_id = var.account_id
  name       = "albergue-db"
}

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.account_id
  name              = var.project_name
  production_branch = var.production_branch

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
      production_branch             = var.production_branch
      deployments_enabled           = true
      pr_comments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "custom"
      preview_branch_includes       = var.preview_branches
    }
  }

  deployment_configs = {
    production = {
      compatibility_date  = var.compatibility_date
      compatibility_flags = ["nodejs_compat"]

      environment_variables = {
        NODE_VERSION = "22"
        ENVIRONMENT  = "production"
      }

      secrets = {
        GEOAPIFY_API_KEY  = var.geoapify_api_key
        API_SERVICE_TOKEN = var.api_service_token
      }

      kv_namespaces = {
        CACHE   = cloudflare_workers_kv_namespace.cache.id
        SESSION = cloudflare_workers_kv_namespace.session.id
      }

      d1_databases = {
        DB = cloudflare_d1_database.albergue_db.id
      }
    }

    preview = {
      compatibility_date  = var.compatibility_date
      compatibility_flags = ["nodejs_compat"]

      environment_variables = {
        NODE_VERSION = "22"
        ENVIRONMENT  = "preview"
      }

      secrets = {
        GEOAPIFY_API_KEY  = var.geoapify_api_key
        API_SERVICE_TOKEN = var.api_service_token
      }

      kv_namespaces = {
        CACHE   = cloudflare_workers_kv_namespace.cache_preview.id
        SESSION = cloudflare_workers_kv_namespace.session_preview.id
      }

      d1_databases = {
        DB = cloudflare_d1_database.albergue_db.id
      }
    }
  }
}
