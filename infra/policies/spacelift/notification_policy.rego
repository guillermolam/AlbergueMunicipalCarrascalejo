package spacelift

import rego.v1

# =============================================================================
# Notification Policy — alert on run failures and drift
# =============================================================================
# Sends GitHub commit status updates and Slack alerts for:
#   - Run failures (FAILED state)
#   - Drift detection findings (reconciliation needed)
# =============================================================================

# Notify on any run failure
notify contains message if {
  input.run.state == "FAILED"
  message := {
    "title": sprintf("[Spacelift] Run failed in stack '%s'", [input.stack.id]),
    "body": sprintf("Run %s failed.\nStack: %s\nBranch: %s\nTriggered by: %s",
      [input.run.id, input.stack.id, input.stack.branch, input.run.triggeredBy]),
    "severity": "error",
  }
}

# Notify when drift is detected
notify contains message if {
  input.run.type == "PROPOSED"
  input.run.state == "FINISHED"
  count(input.run.delta.resources.changed) > 0
  message := {
    "title": sprintf("[Spacelift] Drift detected in stack '%s'", [input.stack.id]),
    "body": sprintf("Drift detected: %d resource(s) have configuration drift.\nStack: %s",
      [count(input.run.delta.resources.changed), input.stack.id]),
    "severity": "warning",
  }
}
