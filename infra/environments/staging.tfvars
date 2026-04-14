# =============================================================================
# Staging environment — mirrors production shape but can be destroyed safely
# =============================================================================

instance_display_name              = "DockerHostStaging"
instance_shape                     = "VM.Standard.A1.Flex"
instance_shape_config_ocpus        = 2
instance_shape_config_memory_gb    = 12
instance_shape_boot_volume_size_gb = 50
docker_volume_size_gb              = 50
timezone                           = "Europe/Madrid"
install_runtipi                    = false
enable_ping                        = true
ssh_source_cidr                    = "0.0.0.0/0"
enable_unrestricted_egress         = true

default_branch   = "staging"
preview_branches = ["develop"]
