variable "tenancy_ocid" {
  type     = string
  nullable = false
}

variable "compartment_ocid" {
  type     = string
  nullable = false
}

variable "user_ocid" {
  type     = string
  nullable = false
}

variable "oracle_api_key_fingerprint" {
  type     = string
  nullable = false
}

variable "oracle_api_private_key_path" {
  type    = string
  default = "~/.oci/oci_api_key.pem"
}

variable "ssh_public_key" {
  type      = string
  sensitive = true
  nullable  = false
}

variable "additional_ssh_public_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "wireguard_client_configuration" {
  type      = string
  sensitive = true
  default   = ""
}

variable "install_runtipi" {
  type    = bool
  default = true
}
