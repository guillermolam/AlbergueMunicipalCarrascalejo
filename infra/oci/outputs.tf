output "instance_public_ip" {
  description = "Reserved public IP address of the OCI ARM instance"
  value       = oci_core_public_ip.public_ip.ip_address
}

output "instance_id" {
  description = "OCID of the compute instance"
  value       = oci_core_instance.instance.id
}

output "instance_private_ip" {
  description = "Private IP address of the compute instance within the VCN"
  value       = oci_core_instance.instance.private_ip
}

output "block_volume_id" {
  description = "OCID of the Docker data block volume"
  value       = oci_core_volume.docker_volume.id
}

output "vcn_id" {
  description = "OCID of the Virtual Cloud Network"
  value       = oci_core_vcn.vcn.id
}

output "subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.subnet.id
}

output "availability_domain" {
  description = "Availability domain where the instance is deployed"
  value       = data.oci_identity_availability_domain.ad.name
}
