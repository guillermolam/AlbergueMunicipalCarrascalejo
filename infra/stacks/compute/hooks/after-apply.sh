#!/usr/bin/env bash
# =============================================================================
# Compute stack — after_apply hook (runs inside the Spacelift worker)
# Exports the instance public IP to Spacelift outputs so the
# .spacelift/hooks/after-apply-compute.sh hook can pass it to GitHub.
# =============================================================================
set -euo pipefail

echo "[compute:after-apply] Capturing Terraform outputs..."
terraform output -json | jq '.'

INSTANCE_IP=$(terraform output -raw instance_public_ip 2>/dev/null || echo "")
if [[ -n $INSTANCE_IP ]]; then
	echo "[compute:after-apply] Instance IP: $INSTANCE_IP"
	# Write to a file that the Spacelift runner can pick up
	echo "$INSTANCE_IP" >/tmp/instance_public_ip
else
	echo "[compute:after-apply] WARNING: instance_public_ip output not available yet"
fi
