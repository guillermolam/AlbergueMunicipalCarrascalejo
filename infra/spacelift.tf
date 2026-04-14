# =============================================================================
# Spacelift Meta-Stack — manages all other stacks
# =============================================================================
#
# Managed by the "admin" bootstrap stack (created once manually in Spacelift UI).
#
# Stack dependency graph:
#   admin (this file) → platform → cloudflare
#                               → databases
#                               → compute
#
# First-time bootstrap:
#   1. In Spacelift UI: create stack "admin"
#      - Repository: AlbergueMunicipalCarrascalejo / branch: main
#      - Project root: infra
#      - Terraform version: 1.9.0
#   2. Add SPACELIFT_API_KEY_ID + SPACELIFT_API_KEY_SECRET to stack env vars
#   3. Apply once — Spacelift manages itself from then on.
# =============================================================================

terraform {
  required_providers {
    spacelift = {
      source  = "spacelift-io/spacelift"
      version = "~> 1.0"
    }
  }
}

# ── Shared context (env vars available to all stacks) ─────────────────────────

resource "spacelift_context" "shared" {
  name        = "albergue-shared"
  description = "Shared environment variables available to all Albergue stacks"
  space_id    = "root"
}

# GitHub token — used by after_apply hooks to dispatch workflow events
resource "spacelift_environment_variable" "github_token" {
  context_id = spacelift_context.shared.id
  name       = "GITHUB_TOKEN"
  value      = var.github_token
  write_only = true
}

# ── Stack definitions ──────────────────────────────────────────────────────────

resource "spacelift_stack" "platform" {
  name              = "platform"
  description       = "GitHub repo settings, branch protection, CI secrets"
  repository        = "AlbergueMunicipalCarrascalejo"
  branch            = "main"
  project_root      = "infra/stacks/platform"
  terraform_version = "1.9.0"
  autodeploy        = false
  space_id          = "root"

  labels = ["layer:platform", "project:albergue"]
}

resource "spacelift_stack" "cloudflare" {
  name              = "cloudflare"
  description       = "Cloudflare Pages, KV namespaces, D1 database"
  repository        = "AlbergueMunicipalCarrascalejo"
  branch            = "main"
  project_root      = "infra/stacks/cloudflare"
  terraform_version = "1.9.0"
  autodeploy        = false
  space_id          = "root"

  labels = ["layer:cdn", "project:albergue"]

  # After CF infra apply: dispatch GitHub event so deploy.yml redeploys the app
  after_apply = [
    "bash .spacelift/hooks/after-apply-cloudflare.sh"
  ]
}

resource "spacelift_stack" "databases" {
  name              = "databases"
  description       = "Turso SQLite edge database"
  repository        = "AlbergueMunicipalCarrascalejo"
  branch            = "main"
  project_root      = "infra/stacks/databases"
  terraform_version = "1.9.0"
  autodeploy        = false
  space_id          = "root"

  labels = ["layer:data", "project:albergue"]
}

resource "spacelift_stack" "compute" {
  name              = "compute"
  description       = "OCI Always Free ARM64 instance with RunTipi + OCR service"
  repository        = "AlbergueMunicipalCarrascalejo"
  branch            = "main"
  project_root      = "infra/stacks/compute"
  terraform_version = "1.9.0"
  autodeploy        = false
  space_id          = "root"

  labels = ["layer:compute", "project:albergue"]

  # After compute apply: dispatch GitHub event so deploy-ocr.yml deploys containers
  after_apply = [
    "bash infra/stacks/compute/hooks/after-apply.sh",
    "bash .spacelift/hooks/after-apply-compute.sh"
  ]
}

# ── Stack dependencies (trigger order) ────────────────────────────────────────

resource "spacelift_stack_dependency" "cloudflare_after_platform" {
  stack_id            = spacelift_stack.cloudflare.id
  depends_on_stack_id = spacelift_stack.platform.id
}

resource "spacelift_stack_dependency" "databases_after_platform" {
  stack_id            = spacelift_stack.databases.id
  depends_on_stack_id = spacelift_stack.platform.id
}

resource "spacelift_stack_dependency" "compute_after_platform" {
  stack_id            = spacelift_stack.compute.id
  depends_on_stack_id = spacelift_stack.platform.id
}

# ── Drift detection ────────────────────────────────────────────────────────────
# Runs daily at 06:00 UTC. Notification policy fires GitHub issues on drift.
# reconcile=true (auto-apply) only for stateless/idempotent stacks.
# compute stack has reconcile=false — OCI instance recreation is destructive.

resource "spacelift_drift_detection" "platform" {
  stack_id  = spacelift_stack.platform.id
  schedule  = ["0 6 * * *"]
  timezone  = "UTC"
  reconcile = true # GitHub settings, branch rules — safe to auto-reconcile
}

resource "spacelift_drift_detection" "cloudflare" {
  stack_id  = spacelift_stack.cloudflare.id
  schedule  = ["0 6 * * *"]
  timezone  = "UTC"
  reconcile = true # KV namespaces, D1, Pages — safe to auto-reconcile
}

resource "spacelift_drift_detection" "databases" {
  stack_id  = spacelift_stack.databases.id
  schedule  = ["0 6 * * *"]
  timezone  = "UTC"
  reconcile = true # Turso group/database — safe to auto-reconcile
}

resource "spacelift_drift_detection" "compute" {
  stack_id  = spacelift_stack.compute.id
  schedule  = ["0 6 * * *"]
  timezone  = "UTC"
  reconcile = false # ⚠️ OCI instance — manual review required before re-apply
}

# ── Policies ───────────────────────────────────────────────────────────────────

resource "spacelift_policy" "admin_login" {
  name     = "admin-login"
  type     = "LOGIN"
  body     = file("${path.module}/policies/spacelift/admin_login_policy.rego")
  space_id = "root"
}

resource "spacelift_policy" "plan" {
  name     = "plan-approval"
  type     = "PLAN"
  body     = file("${path.module}/policies/spacelift/plan_policy.rego")
  space_id = "root"
}

resource "spacelift_policy" "trigger" {
  name     = "stack-triggers"
  type     = "TRIGGER"
  body     = file("${path.module}/policies/spacelift/trigger_policy.rego")
  space_id = "root"
}

resource "spacelift_policy" "notification" {
  name     = "notifications"
  type     = "NOTIFICATION"
  body     = file("${path.module}/policies/spacelift/notification_policy.rego")
  space_id = "root"
}

# Attach all policies to all managed stacks

locals {
  managed_stack_ids = [
    spacelift_stack.platform.id,
    spacelift_stack.cloudflare.id,
    spacelift_stack.databases.id,
    spacelift_stack.compute.id,
  ]

  policy_stack_pairs = {
    for pair in setproduct(
      ["plan", "trigger", "notification"],
      local.managed_stack_ids
    ) : "${pair[0]}:${pair[1]}" => { policy = pair[0], stack_id = pair[1] }
  }
}

resource "spacelift_policy_attachment" "plan" {
  for_each  = toset(local.managed_stack_ids)
  policy_id = spacelift_policy.plan.id
  stack_id  = each.value
}

resource "spacelift_policy_attachment" "trigger" {
  for_each  = toset(local.managed_stack_ids)
  policy_id = spacelift_policy.trigger.id
  stack_id  = each.value
}

resource "spacelift_policy_attachment" "notification" {
  for_each  = toset(local.managed_stack_ids)
  policy_id = spacelift_policy.notification.id
  stack_id  = each.value
}

# Attach shared context (GITHUB_TOKEN) to all stacks
resource "spacelift_context_attachment" "shared" {
  for_each   = toset(local.managed_stack_ids)
  context_id = spacelift_context.shared.id
  stack_id   = each.value
  priority   = 1
}

# ── Compute-specific context (CI deploy key) ───────────────────────────────────
# The CI deploy key public key is injected as TF_VAR_additional_ssh_public_key
# so Terraform passes it to the OCI startup script's authorized_keys list.
# The matching private key is stored as OCI_SSH_PRIVATE_KEY in GitHub Secrets.

resource "spacelift_context" "compute_ci" {
  name        = "albergue-compute-ci"
  description = "CI deploy public key — allows GitHub Actions to SSH into the OCI instance for rolling OCR deploys"
  space_id    = "root"
}

resource "spacelift_environment_variable" "ci_deploy_pubkey" {
  context_id = spacelift_context.compute_ci.id
  name       = "TF_VAR_additional_ssh_public_key"
  value      = var.ci_deploy_public_key
  write_only = false # Public key — not sensitive; visible in plan output is fine
}

resource "spacelift_context_attachment" "compute_ci" {
  context_id = spacelift_context.compute_ci.id
  stack_id   = spacelift_stack.compute.id
  priority   = 2
}

# ── Spacelift API key (managed machine key for GitHub Actions) ─────────────────
# The key (id=01KP5YYPQP46DH4FV5JXP1AMFN) was created via the Spacelift GraphQL
# API authenticated with the guillermolam GitHub OAuth identity and is stored as
# SPACELIFT_API_KEY_ID / SPACELIFT_API_KEY_SECRET in GitHub Secrets.
#
# GitHub Actions workflows authenticate to Spacelift using the apiKeyUser mutation:
#   JWT=$(curl ... -d '{"query":"mutation { apiKeyUser(id:\"...\", secret:\"...\") { jwt } }"}')
#
# The key is not managed as a Terraform resource because:
#   1. The Spacelift provider cannot import existing keys (secret is one-time)
#   2. Key rotation is done via Spacelift UI or the oauthUser GraphQL flow
#
# Rotation: gh workflow run terraform.yml  (uses GH OAuth → Spacelift admin JWT)
# Expiry  : 1 year from creation (April 2027 — set in Spacelift)

# ── Input variables ────────────────────────────────────────────────────────────

variable "github_token" {
  type        = string
  sensitive   = true
  description = "GitHub token — injected into all stacks for after_apply dispatch hooks"
}

variable "ci_deploy_public_key" {
  type        = string
  sensitive   = false
  description = "SSH public key for GitHub Actions OCR deploy — added to OCI instance authorized_keys"
  # Default is the key generated by .spacelift/setup-oidc.sh / GH Actions deploy key
  default = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILvHAChh7hiQnWkW8WheaZcJApWxX0hp3917LvvA5urX gh-actions-ocr-deploy@albergue-carrascalejo"
}
