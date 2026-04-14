variable "group_name" {
  type        = string
  description = "Turso group name"
  default     = "alberguecarrascalejo-app-db"
}

variable "primary_location" {
  type        = string
  description = "Primary Turso location (aws-eu-west-1 is closest to Spain)"
  default     = "aws-eu-west-1"
}

variable "replica_locations" {
  type        = list(string)
  description = "Additional replica locations for the group"
  default     = []
}

variable "database_name" {
  type        = string
  description = "Name of the Turso database"
  default     = "bookings"
}
