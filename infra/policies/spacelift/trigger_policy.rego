package spacelift

import rego.v1

# =============================================================================
# Trigger Policy — cascade stack triggers
# =============================================================================
# After the platform stack applies successfully, trigger dependent stacks.
# Stack dependency graph:
#   platform → cloudflare
#   platform → databases
#   platform → compute
# =============================================================================

# Trigger cloudflare stack when platform finishes
trigger contains stack_id if {
  input.run.state == "FINISHED"
  input.run.type == "TRACKED"
  input.stack.id == "platform"
  stack_id := "cloudflare"
}

# Trigger databases stack when platform finishes
trigger contains stack_id if {
  input.run.state == "FINISHED"
  input.run.type == "TRACKED"
  input.stack.id == "platform"
  stack_id := "databases"
}

# Trigger compute stack when platform finishes
trigger contains stack_id if {
  input.run.state == "FINISHED"
  input.run.type == "TRACKED"
  input.stack.id == "platform"
  stack_id := "compute"
}
