module "cf_pages" {
  source = "../../modules/cloudflare-pages"

  account_id        = var.cloudflare_account_id
  project_name      = "albergue-carrascalejo"
  production_branch = var.default_branch
  github_owner      = var.github_owner
  repository_name   = var.repository_name
  geoapify_api_key  = var.geoapify_api_key
  api_service_token = var.api_service_token
}

output "pages_url"            { value = module.cf_pages.pages_url }
output "d1_database_id"       { value = module.cf_pages.d1_database_id }
output "kv_cache_id"          { value = module.cf_pages.kv_cache_id }
output "kv_session_id"        { value = module.cf_pages.kv_session_id }
output "kv_cache_preview_id"  { value = module.cf_pages.kv_cache_preview_id }
output "kv_session_preview_id" { value = module.cf_pages.kv_session_preview_id }
