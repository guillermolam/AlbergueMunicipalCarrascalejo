# Spacelift manages state for this stack automatically.
# When migrating from TFC, run:
#   terraform state pull > backup-platform.tfstate
#   spacelift stack set-state --stack platform < backup-platform.tfstate
#
# For local/bootstrap runs, use an S3 backend:
# terraform {
#   backend "s3" {
#     bucket = "spacelift-state-albergue"
#     key    = "stacks/platform/terraform.tfstate"
#     region = "eu-west-1"
#   }
# }
