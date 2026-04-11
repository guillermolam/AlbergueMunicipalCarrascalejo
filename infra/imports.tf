# =============================================================================
# Terraform import blocks (TF >= 1.5)
#
# These adopt pre-existing Cloudflare resources that were created manually
# (or via wrangler CLI) before Terraform was fully wired up.
#
# After the first successful `terraform apply` these import blocks are
# idempotent (Terraform skips them if the resource is already in state).
# =============================================================================

# Adopt the existing Pages project (created manually in the CF dashboard).
# Format: "<account_id>/<project_name>"
import {
  to = cloudflare_pages_project.frontend
  id = "798e36259a38e6217cc9987ce0bf1316/albergue-carrascalejo"
}

# Adopt the KV namespaces created via wrangler CLI.
# Format: "<account_id>/<namespace_id>"
import {
  to = cloudflare_workers_kv_namespace.cache
  id = "798e36259a38e6217cc9987ce0bf1316/9730f4ee95c84093a9a399c24d3607d9"
}

import {
  to = cloudflare_workers_kv_namespace.cache_preview
  id = "798e36259a38e6217cc9987ce0bf1316/3b8b01d0817d4973b3c6562177be4bbc"
}

import {
  to = cloudflare_workers_kv_namespace.session
  id = "798e36259a38e6217cc9987ce0bf1316/e37d242325bc4a9ca480e90543971a07"
}

import {
  to = cloudflare_workers_kv_namespace.session_preview
  id = "798e36259a38e6217cc9987ce0bf1316/fae4d5012fa149c591b44a86c8e721bf"
}

# D1 database (created via wrangler CLI with the terraform token)
import {
  to = cloudflare_d1_database.albergue_db
  id = "798e36259a38e6217cc9987ce0bf1316/541bcbf5-059b-485d-8f96-690c22b6bc0f"
}
