# =============================================================================
# Redis Cloud (Cache & Rate Limiting - Free Tier 30MB)
# =============================================================================

data "rediscloud_essentials_subscription" "this" {
  name = "Internal-guillermolam-free-db"
}

# =============================================================================
# Outputs
# =============================================================================

output "redis_subscription_id" {
  description = "Redis Cloud subscription ID"
  value       = data.rediscloud_essentials_subscription.this.id
}

output "redis_endpoint" {
  description = "Redis Cloud endpoint"
  value       = "redis-13192.c233.eu-west-1-1.ec2.cloud.redislabs.com:13192"
}
