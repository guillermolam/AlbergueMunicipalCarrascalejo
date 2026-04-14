output "repository_node_id" {
  description = "GitHub node ID of the repository"
  value       = github_repository.this.node_id
}

output "repository_full_name" {
  description = "Full name of the repository (owner/name)"
  value       = github_repository.this.full_name
}

output "html_url" {
  description = "Web URL of the repository"
  value       = github_repository.this.html_url
}
