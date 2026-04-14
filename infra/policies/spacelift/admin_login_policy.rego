package spacelift

import rego.v1

# -----------------------------------------------------------------------------
# CONFIGURATION
# -----------------------------------------------------------------------------

# Sole admin GitHub username (case-sensitive)
sole_admin_username := "guillermolam"

# Required GitHub team membership for admin access
required_admin_team := "albergue-infra-admins"

# Maximum session duration in hours
max_session_hours := 4

# MFA authentication method reference values (GitHub OIDC standard)
acceptable_mfa_methods := {"mfa", "otp", "hwk", "swk"}

# -----------------------------------------------------------------------------
# DATA SOURCES (Expected from Spacelift input)
# -----------------------------------------------------------------------------
# input.session contains: github_user, teams[], claims{}, login_time, ip_address
# input.request contains: resource, action, space, stack
# -----------------------------------------------------------------------------

# -----------------------------------------------------------------------------
# MAIN DECISION
# -----------------------------------------------------------------------------

# Default deny all
default allow := false

# Admin login is allowed only if all conditions pass
allow if {
	is_valid_admin_identity
	is_sole_admin_user
	has_required_team_membership
	has_mfa_verified
	is_within_session_limit
	is_audit_logged
}

# -----------------------------------------------------------------------------
# DENY REASONS (For debugging and audit trails)
# -----------------------------------------------------------------------------

deny contains msg if {
	not is_valid_admin_identity
	msg := "Invalid identity: GitHub OIDC token missing or malformed"
}

deny contains msg if {
	is_valid_admin_identity
	not is_sole_admin_user
	msg := "There is only one admin"
}

deny contains msg if {
	is_valid_admin_identity
	is_sole_admin_user
	not has_required_team_membership
	msg := sprintf("Admin must be member of team: %s", [required_admin_team])
}

deny contains msg if {
	is_valid_admin_identity
	is_sole_admin_user
	not has_mfa_verified
	msg := "Multi-factor authentication required but not verified"
}

deny contains msg if {
	is_valid_admin_identity
	is_sole_admin_user
	not is_within_session_limit
	msg := sprintf("Session exceeds maximum duration of %d hours", [max_session_hours])
}

# -----------------------------------------------------------------------------
# POLICY RULES
# -----------------------------------------------------------------------------

# Verify GitHub OIDC identity is present and valid
is_valid_admin_identity if {
	input.session.github_user == sole_admin_username
	input.session.claims.iss == "https://github.com"
	# Or if using GitHub App/OAuth: "https://github.com"
}

# Ensure the user is the sole designated admin
is_sole_admin_user if {
	input.session.github_user == sole_admin_username
}

# Verify membership in the required infrastructure admin team
has_required_team_membership if {
	# Check if user is member of the required team
	# Teams come from GitHub OIDC token or Spacelift's GitHub integration
	some team in input.session.teams
	team == required_admin_team
}

# Verify MFA was used during authentication
has_mfa_verified if {
	# Check amr (Authentication Methods Reference) claim
	some method in input.session.claims.amr
	method in acceptable_mfa_methods
}

# Alternative MFA check if amr not available (GitHub enforces MFA at org level)
has_mfa_verified if {
	# Fallback: Check if GitHub organization enforces MFA via custom claim
	input.session.claims.mfa_verified == true
}

# Check session duration hasn't exceeded limit
is_within_session_limit if {
	# Calculate session duration from login_time (Unix timestamp)
	now := time.now_ns() / 1000000000 # Convert to seconds
	login_time := input.session.login_time
	session_duration_hours := (now - login_time) / 3600

	session_duration_hours < max_session_hours
}

# -----------------------------------------------------------------------------
# AUDIT LOGGING
# -----------------------------------------------------------------------------

# Audit trail for all admin login attempts
is_audit_logged if {
	# This generates an audit event that Spacelift can capture
	# The audit event is captured in the audit_event object
	input.session.github_user
}

# Additional audit metadata for allowed logins
audit_event := {
	"event_type": "admin_login",
	"user": input.session.github_user,
	"timestamp": time.now_ns(),
	"ip_address": input.session.ip_address,
	"teams": input.session.teams,
	"mfa_verified": has_mfa_verified,
	"session_duration_hours": max_session_hours,
	"space": object.get(input.request, "space", "global"),
	"action": object.get(input.request, "action", "login"),
	"allowed": allow,
	"deny_reasons": deny,
} if {
	is_valid_admin_identity
}

# -----------------------------------------------------------------------------
# SCALAR VALUES FOR SPACELIFT RESPONSE
# -----------------------------------------------------------------------------

# Human-readable decision explanation
decision_explanation := "Admin login approved - sole admin verified with MFA and team membership" if {
	allow
}

decision_explanation := concat("; ", deny) if {
	not allow
	count(deny) > 0
}

decision_explanation := "Access denied by default policy" if {
	not allow
	count(deny) == 0
}
