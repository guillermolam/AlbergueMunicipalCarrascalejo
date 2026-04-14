package spacelift

import rego.v1

# =============================================================================
# Plan Policy — auto-approve safe Terraform plans
# =============================================================================
# Auto-approves a plan if:
#   1. No resource deletions
#   2. No changes to security lists / VCN route tables / IAM
#
# Denies (requires human approval) for any destructive or security changes.
# =============================================================================

# Collect all proposed resource changes
proposed_changes := {change | change := input.terraform.resource_changes[_]}

# Changes that delete a resource
deletions := {change |
  change := proposed_changes[_]
  change.change.actions[_] == "delete"
}

# Changes to security-related OCI or identity resources
security_changes := {change |
  change := proposed_changes[_]
  regex.match("oci_core_security_list|oci_identity|oci_core_default_route_table", change.type)
}

# ── Decisions ─────────────────────────────────────────────────────────────────

# Auto-approve: no deletions and no security changes
approve if {
  count(deletions) == 0
  count(security_changes) == 0
}

# Deny: resource deletions present
deny contains reason if {
  count(deletions) > 0
  resources := [r.address | r := deletions[_]]
  reason := sprintf("Plan deletes %d resource(s): %v — human approval required", [count(deletions), resources])
}

# Deny: security infrastructure being modified
deny contains reason if {
  count(security_changes) > 0
  resources := [r.address | r := security_changes[_]]
  reason := sprintf("Plan modifies security infrastructure %v — human approval required", [resources])
}
