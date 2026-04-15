package anti_bypass_gate_test

import rego.v1
import data.anti_bypass_gate

base_input := {
  "staged_files": [],
  "diff_content": {},
  "commit_message": "",
  "author": "test",
  "branch": "main",
  "emoji_detected": {},
  "palette_violations": [],
  "coverage_percent": null,
  "file_modes": {},
  "file_sizes": {},
  "gitignore_entries": [],
  "is_human_verified": false,
  "deleted_files": [],
}

# ---------------------------------------------------------------------------
# P018 — No hiding source from scanners via .gitignore
# ---------------------------------------------------------------------------
test_p018_blocks_gitignore_backend if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": [".gitignore"],
    "diff_content": {".gitignore": "+backend/booking-service/src/"},
  })
  count({v | some v in result; v.policy == "P018-no-scanner-gitignore-bypass"}) > 0
}

test_p018_allows_target_exclusion if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": [".gitignore"],
    "diff_content": {".gitignore": "+backend/target/"},
  })
  count({v | some v in result; v.policy == "P018-no-scanner-gitignore-bypass"}) == 0
}

# ---------------------------------------------------------------------------
# P019 — Mass suppression detection
# ---------------------------------------------------------------------------
test_p019_blocks_mass_nosonar if {
  diff := concat("\n", [
    "+// NOSONAR",
    "+// NOSONAR",
    "+// NOSONAR",
    "+// NOSONAR",
  ])
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": ["backend/booking-service/src/lib.rs"],
    "diff_content": {"backend/booking-service/src/lib.rs": diff},
  })
  count({v | some v in result; v.policy == "P019-no-mass-suppressions"}) > 0
}

test_p019_warns_few_suppressions if {
  diff := concat("\n", [
    "+// NOSONAR - justified: false positive on D1 binding",
    "+fn something() {}",
  ])
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": ["backend/booking-service/src/lib.rs"],
    "diff_content": {"backend/booking-service/src/lib.rs": diff},
  })
  count({v | some v in result; v.policy == "P019-suppression-audit"}) > 0
}

# ---------------------------------------------------------------------------
# P020 — Scanner config weakening
# ---------------------------------------------------------------------------
test_p020_blocks_sonar_exclusions if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": ["sonar-project.properties"],
    "diff_content": {"sonar-project.properties": "+sonar.exclusions=backend/**"},
  })
  count({v | some v in result; v.policy == "P020-no-scanner-weakening"}) > 0
}

test_p020_allows_with_human_approval if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "staged_files": ["sonar-project.properties"],
    "diff_content": {"sonar-project.properties": "+sonar.exclusions=backend/**"},
    "is_human_verified": true,
  })
  count({v | some v in result; v.policy == "P020-no-scanner-weakening"}) == 0
}

# ---------------------------------------------------------------------------
# P021 — No test deletion
# ---------------------------------------------------------------------------
test_p021_blocks_test_file_deletion if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "deleted_files": ["backend/booking-service/tests/booking_test.rs"],
  })
  count({v | some v in result; v.policy == "P021-no-test-deletion"}) > 0
}

test_p021_allows_non_test_deletion if {
  result := anti_bypass_gate.violations with input as object.union(base_input, {
    "deleted_files": ["backend/api-service/src/lib.rs"],
  })
  count({v | some v in result; v.policy == "P021-no-test-deletion"}) == 0
}
