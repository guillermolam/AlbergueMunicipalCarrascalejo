terraform {
  cloud {
    organization = "albergue-elcarrascalejo"

    workspaces {
      name = "AlbergueMunicipalCarrascalejo"
    }
  }

  required_version = ">= 1.5"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.11"
    }
    tfe = {
      source  = "hashicorp/tfe"
      version = "~> 0.76"
    }
    # cloudflare - needs scoped API Token
    # cloudflare = {
    #   source  = "cloudflare/cloudflare"
    #   version = "~> 5.18"
    # }
    # neon - needs org-level API key
    # neon = {
    #   source  = "terraform-community-providers/neon"
    #   version = "~> 0.1.12"
    # }
    turso = {
      source  = "celest-dev/turso"
      version = "~> 0.2.3"
    }
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
    # rediscloud - requires paid plan for API access
    # rediscloud = {
    #   source  = "RedisLabs/rediscloud"
    #   version = "~> 2.14"
    # }
  }
}
