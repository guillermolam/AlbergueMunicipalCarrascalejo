module "oci_compute" {
  source = "../../modules/oci-compute"

  # Identity
  tenancy_ocid                = var.tenancy_ocid
  compartment_ocid            = var.compartment_ocid
  user_ocid                   = var.user_ocid
  oracle_api_key_fingerprint  = var.oracle_api_key_fingerprint
  oracle_api_private_key_path = var.oracle_api_private_key_path

  # Region — must match Oracle account home region for Always Free A1 availability
  region = "eu-madrid-1"

  # Instance — Always Free maximums
  instance_display_name              = "DockerHost"
  instance_shape                     = "VM.Standard.A1.Flex"
  instance_shape_config_ocpus        = 4
  instance_shape_config_memory_gb    = 24
  instance_shape_boot_volume_size_gb = 50

  # Storage — boot (50 GB) + data (150 GB) = 200 GB = Always Free limit
  docker_volume_size_gb = 150

  # Network
  vcn_cidr_block    = "10.1.0.0/16"
  subnet_cidr_block = "10.1.0.0/24"
  ssh_source_cidr   = "0.0.0.0/0"
  enable_ping       = false

  # OS & Apps
  timezone        = "Europe/Madrid"
  install_runtipi = var.install_runtipi

  # SSH
  ssh_public_key            = var.ssh_public_key
  additional_ssh_public_key = var.additional_ssh_public_key

  # WireGuard
  wireguard_client_configuration = var.wireguard_client_configuration

  freeform_tags = {
    "ManagedBy"   = "Terraform"
    "Stack"       = "compute"
    "Environment" = "production"
  }
}

output "instance_public_ip" { value = module.oci_compute.instance_public_ip }
output "instance_id" { value = module.oci_compute.instance_id }
output "block_volume_id" { value = module.oci_compute.block_volume_id }
output "vcn_id" { value = module.oci_compute.vcn_id }
