# =============================================================================
# Production environment variable overrides
# Usage: terraform plan -var-file=../../environments/production.tfvars
# =============================================================================

# OCI Compute
instance_display_name              = "DockerHost"
instance_shape                     = "VM.Standard.A1.Flex"
instance_shape_config_ocpus        = 4
instance_shape_config_memory_gb    = 24
instance_shape_boot_volume_size_gb = 50
docker_volume_size_gb              = 150
timezone                           = "Europe/Madrid"
install_runtipi                    = true
enable_ping                        = false
ssh_source_cidr                    = "0.0.0.0/0"
enable_unrestricted_egress         = true

# CF Pages
default_branch   = "main"
preview_branches = ["develop", "staging"]
