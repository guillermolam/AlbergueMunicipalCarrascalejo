terraform {
  required_version = ">= 1.5.0"

  required_providers {
    turso = {
      source  = "celest-dev/turso"
      version = "~> 0.2.3"
    }
  }
}

provider "turso" {
  api_token    = var.turso_api_token
  organization = "guillermolam"
}
