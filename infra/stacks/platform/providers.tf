terraform {
  required_version = ">= 1.5.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.11"
    }
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
  }
}

provider "github" {
  owner = var.github_owner
  token = var.github_token
}

provider "spacelift" {
  api_key_endpoint = var.spacelift_api_endpoint
  api_key_id       = var.spacelift_api_key_id
  api_key_secret   = var.spacelift_api_key_secret
}
