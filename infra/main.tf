terraform {
  cloud {
    organization = "albergue-elcarrascalejo"

    workspaces {
      name = "AlbergueMunicipalCarrascalejo"
    }
  }

  required_version = ">= 1.0"

  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}
