output "pages_url" {
  description = "Cloudflare Pages production URL"
  value       = "https://${cloudflare_pages_project.frontend.name}.pages.dev"
}

output "d1_database_id" {
  description = "D1 database ID — copy to frontend/wrangler.jsonc d1_databases[0].database_id"
  value       = cloudflare_d1_database.albergue_db.id
}

output "kv_cache_id" {
  description = "CACHE KV namespace ID"
  value       = cloudflare_workers_kv_namespace.cache.id
}

output "kv_cache_preview_id" {
  description = "CACHE KV preview namespace ID"
  value       = cloudflare_workers_kv_namespace.cache_preview.id
}

output "kv_session_id" {
  description = "SESSION KV namespace ID"
  value       = cloudflare_workers_kv_namespace.session.id
}

output "kv_session_preview_id" {
  description = "SESSION KV preview namespace ID"
  value       = cloudflare_workers_kv_namespace.session_preview.id
}
