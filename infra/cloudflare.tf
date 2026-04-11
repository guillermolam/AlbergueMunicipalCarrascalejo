# =============================================================================
# Cloudflare Resources — KV Namespaces, D1 Database, Pages Project
# =============================================================================
#
# Prerequisites (one-time, per engineer):
#   1. Create a scoped API Token at dash.cloudflare.com/profile/api-tokens
#      Use template: "Edit Cloudflare Pages"
#      Add extra scopes: Workers KV Storage:Edit, D1:Edit
#   2. Set cloudflare_api_token as a sensitive variable in the TFC workspace
#      (Organisation: albergue-elcarrascalejo / Workspace: AlbergueMunicipalCarrascalejo)
#   3. Also set in TFC: geoapify_api_key, api_service_token (both sensitive)
#
# GitHub source connection:
#   Terraform can configure the source block but the OAuth handshake must be
#   completed once in the CF dashboard:
#   Pages → albergue-carrascalejo → Settings → Builds & Deployments → Connect Git
#   After that Terraform manages all future configuration drift.
#
# Free tier coverage for this project:
#   - Cloudflare Pages        (unlimited sites, 500 builds/month)
#   - Workers KV              (100K reads/day, 1K writes/day free)
#   - D1 SQLite               (5 GB storage, 5M rows/month free)
#   - Workers CPU             (100K requests/day free)
#   - DDoS protection + CDN   (always-on, no charge)
# =============================================================================

# -----------------------------------------------------------------------------
# KV Namespaces — CACHE (short-lived API responses) + SESSION (auth sessions)
# -----------------------------------------------------------------------------

resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.cloudflare_account_id
  title      = "albergue-cache-production"
}

resource "cloudflare_workers_kv_namespace" "cache_preview" {
  account_id = var.cloudflare_account_id
  title      = "albergue-cache-preview"
}

resource "cloudflare_workers_kv_namespace" "session" {
  account_id = var.cloudflare_account_id
  title      = "albergue-session-production"
}

resource "cloudflare_workers_kv_namespace" "session_preview" {
  account_id = var.cloudflare_account_id
  title      = "albergue-session-preview"
}

# -----------------------------------------------------------------------------
# D1 SQLite database — primary datastore (bookings, config, pricing, beds)
# -----------------------------------------------------------------------------

resource "cloudflare_d1_database" "albergue_db" {
  account_id = var.cloudflare_account_id
  name       = "albergue-db"
}

# -----------------------------------------------------------------------------
# Pages Project
# -----------------------------------------------------------------------------

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "albergue-carrascalejo"
  production_branch = var.default_branch

  build_config = {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = "frontend"
  }

  # GitHub source — Terraform configures the parameters; the initial OAuth
  # connection must be authorised once via the CF dashboard (see note above).
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
      compatibility_date  = "2025-05-21"
      compatibility_flags = ["nodejs_compat"]

      environment_variables = {
        NODE_VERSION = "22"
        ENVIRONMENT  = "production"
      }

      # Sensitive values — stored encrypted in CF; never appear in TF state
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
      compatibility_date  = "2025-05-21"
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

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------

output "cloudflare_pages_url" {
  description = "Cloudflare Pages production URL"
  value       = "https://${cloudflare_pages_project.frontend.name}.pages.dev"
}

output "cloudflare_d1_database_id" {
  description = "D1 database ID — copy to frontend/wrangler.jsonc d1_databases[0].database_id"
  value       = cloudflare_d1_database.albergue_db.id
}

output "cloudflare_kv_cache_id" {
  description = "CACHE KV namespace ID — copy to frontend/wrangler.jsonc kv_namespaces CACHE.id"
  value       = cloudflare_workers_kv_namespace.cache.id
}

output "cloudflare_kv_cache_preview_id" {
  description = "CACHE KV preview namespace ID — copy to frontend/wrangler.jsonc kv_namespaces CACHE.preview_id"
  value       = cloudflare_workers_kv_namespace.cache_preview.id
}

output "cloudflare_kv_session_id" {
  description = "SESSION KV namespace ID — copy to frontend/wrangler.jsonc kv_namespaces SESSION.id"
  value       = cloudflare_workers_kv_namespace.session.id
}

output "cloudflare_kv_session_preview_id" {
  description = "SESSION KV preview namespace ID — copy to frontend/wrangler.jsonc kv_namespaces SESSION.preview_id"
  value       = cloudflare_workers_kv_namespace.session_preview.id
}
