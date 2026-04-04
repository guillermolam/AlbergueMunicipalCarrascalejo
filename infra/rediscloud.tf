# =============================================================================
# Redis Cloud (Cache & Rate Limiting - Free Tier 30MB)
# =============================================================================
#
# Redis Cloud free tier does not expose API keys, so Terraform cannot manage
# the subscription. The connection details are hardcoded as outputs and the
# credentials are managed via TFC variables as pass-through.
#
# If you upgrade to a paid Redis Cloud plan, uncomment the provider in
# main.tf and providers.tf, then add resources here.
# =============================================================================

output "redis_endpoint" {
  description = "Redis Cloud endpoint (manually managed)"
  value       = "redis-13192.c233.eu-west-1-1.ec2.cloud.redislabs.com:13192"
}
