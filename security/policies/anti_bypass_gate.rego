package anti_bypass_gate

# =============================================================================
# anti_bypass_gate.rego -- Catches agents trying to silence or bypass
# security tooling (SonarCloud, Trunk, GHAS, Semgrep, Checkov, etc.)
# via .gitignore manipulation, config file changes, or inline suppressions.
# =============================================================================

import rego.v1

# ---------------------------------------------------------------------------
# P018 — No silencing security scanners via .gitignore
# Agents must not add patterns that exclude scanned directories from git,
# effectively making them invisible to SonarCloud, Trunk, GHAS.
# ---------------------------------------------------------------------------
scanner_visible_dirs := [
  "backend/",
  "frontend/",
  "gateway/",
  "infra/",
  "security/",
  "tests/",
  ".github/",
]

violations contains v if {
  some file in input.staged_files
  file == ".gitignore"
  diff := input.diff_content[file]
  some line in split(diff, "\n")
  startswith(line, "+")
  clean := trim_space(substring(line, 1, -1))
  clean != ""
  not startswith(clean, "#")
  some dir in scanner_visible_dirs
  startswith(clean, dir)
  not contains(clean, "target/")
  not contains(clean, "node_modules/")
  not contains(clean, "dist/")
  not contains(clean, ".vite/")
  v := {
    "policy": "P018-no-scanner-gitignore-bypass",
    "severity": "error",
    "file": file,
    "msg": sprintf("Gitignore line '%s' would hide source code from security scanners.", [clean]),
  }
}

# ---------------------------------------------------------------------------
# P019 — No mass inline suppressions
# Catches agents flooding code with NOSONAR, trunk-ignore, nosec, etc.
# A single file with > 3 new suppressions is suspicious.
# ---------------------------------------------------------------------------
suppression_patterns := [
  "NOSONAR",
  "trunk-ignore",
  "nosec",
  "nolint",
  "skipcq",
  "nosemgrep",
  "checkov:skip",
  "CKV_",
  "tfsec:ignore",
  "trivy:ignore",
  "# type: ignore",
  "// @ts-ignore",
  "// @ts-nocheck",
  "eslint-disable",
  "stylelint-disable",
  "rubocop:disable",
  "#[allow(clippy::",
]

count_suppressions(file, diff) := n if {
  lines := [line |
    some line in split(diff, "\n")
    startswith(line, "+")
    some pattern in suppression_patterns
    contains(line, pattern)
  ]
  n := count(lines)
}

violations contains v if {
  some file in input.staged_files
  diff := input.diff_content[file]
  n := count_suppressions(file, diff)
  n > 3
  v := {
    "policy": "P019-no-mass-suppressions",
    "severity": "error",
    "file": file,
    "msg": sprintf("File has %d new lint/security suppressions (max 3). Do not silence scanners en masse.", [n]),
  }
}

# Even 1-3 is a warning
violations contains v if {
  some file in input.staged_files
  diff := input.diff_content[file]
  n := count_suppressions(file, diff)
  n > 0
  n <= 3
  v := {
    "policy": "P019-suppression-audit",
    "severity": "warn",
    "file": file,
    "msg": sprintf("File has %d new lint/security suppression(s). Each must be justified in the commit message.", [n]),
  }
}

# ---------------------------------------------------------------------------
# P020 — No disabling security configs
# Catches modifications to scanner config files that weaken coverage.
# ---------------------------------------------------------------------------
scanner_configs := [
  ".trunk/trunk.yaml",
  ".trunk/configs/",
  "sonar-project.properties",
  ".semgrep.yml",
  ".semgrepignore",
  ".checkov.yaml",
  ".trivyignore",
  ".tfsec.yml",
  "kics.config.json",
]

weakening_patterns := [
  "enabled: false",
  "disabled: true",
  "skip-check",
  "exclude-check",
  "exclude_rules",
  "sonar.exclusions",
  "sonar.coverage.exclusions",
  "ignore:",
  "exclude:",
]

violations contains v if {
  some file in input.staged_files
  some config in scanner_configs
  startswith(file, config)
  diff := input.diff_content[file]
  some line in split(diff, "\n")
  startswith(line, "+")
  some pattern in weakening_patterns
  contains(line, pattern)
  not input.is_human_verified
  v := {
    "policy": "P020-no-scanner-weakening",
    "severity": "error",
    "file": file,
    "msg": sprintf("Scanner config change adds '%s' which may weaken security coverage. Requires human approval.", [pattern]),
  }
}

# ---------------------------------------------------------------------------
# P021 — No removing test files
# Agents must not delete test files to artificially raise coverage.
# ---------------------------------------------------------------------------
violations contains v if {
  some file in input.deleted_files
  contains(file, "test")
  not contains(file, "node_modules")
  v := {
    "policy": "P021-no-test-deletion",
    "severity": "error",
    "file": file,
    "msg": sprintf("Deleting test file '%s' is not allowed. Tests may only be moved or refactored, not removed.", [file]),
  }
}

violations contains v if {
  some file in input.deleted_files
  contains(file, "spec")
  not contains(file, "node_modules")
  v := {
    "policy": "P021-no-test-deletion",
    "severity": "error",
    "file": file,
    "msg": sprintf("Deleting spec file '%s' is not allowed.", [file]),
  }
}

# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------
errors := {v | some v in violations; v.severity == "error"}
warnings := {v | some v in violations; v.severity == "warn"}
allow if count(errors) == 0
