# Spacelift-managed state.
# To migrate existing OCI state from infra/oci/:
#   cd infra/oci && terraform state pull > /tmp/oci-backup.tfstate
#   # Initialize the new backend for this stack, then:
#   terraform state push /tmp/oci-backup.tfstate
