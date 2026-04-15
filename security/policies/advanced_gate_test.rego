package advanced_gate_test

import rego.v1
import data.advanced_gate

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
  "gitignore_entries": ["**/node_modules/", ".env", "*.pem", "**/target/"],
  "is_human_verified": false,
  "deleted_files": [],
}

# ---------------------------------------------------------------------------
# P010 — No React
# ---------------------------------------------------------------------------
test_p010_blocks_react_import if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["frontend/package.json"],
    "diff_content": {"frontend/package.json": "+    \"react\": \"^19.0.0\","},
  })
  count({v | some v in result; v.policy == "P010-no-react"}) > 0
}

test_p010_allows_solid if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["frontend/package.json"],
    "diff_content": {"frontend/package.json": "+    \"solid-js\": \"^1.8.0\","},
  })
  count({v | some v in result; v.policy == "P010-no-react"}) == 0
}

# ---------------------------------------------------------------------------
# P011 — No Tailwind presets
# ---------------------------------------------------------------------------
test_p011_blocks_preset_wind3 if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["frontend/uno.config.ts"],
    "diff_content": {"frontend/uno.config.ts": "+import { presetWind3 } from '@unocss/preset-wind3';"},
  })
  count({v | some v in result; v.policy == "P011-no-tailwind-presets"}) > 0
}

# ---------------------------------------------------------------------------
# P012 — Trunk-based development
# ---------------------------------------------------------------------------
test_p012_blocks_develop_branch if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "branch": "develop",
  })
  count({v | some v in result; v.policy == "P012-trunk-based-dev"}) > 0
}

test_p012_blocks_release_branch if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "branch": "release/1.0.0",
  })
  count({v | some v in result; v.policy == "P012-trunk-based-dev"}) > 0
}

test_p012_allows_main if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "branch": "main",
  })
  count({v | some v in result; v.policy == "P012-trunk-based-dev"}) == 0
}

test_p012_allows_feature_branch if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "branch": "feat/add-booking-endpoint",
  })
  count({v | some v in result; v.policy == "P012-trunk-based-dev"}) == 0
}

# ---------------------------------------------------------------------------
# P013 — Coverage gate
# ---------------------------------------------------------------------------
test_p013_blocks_low_coverage if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "coverage_percent": 72.5,
  })
  count({v | some v in result; v.policy == "P013-coverage-gate"}) > 0
}

test_p013_allows_high_coverage if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "coverage_percent": 96.0,
  })
  count({v | some v in result; v.policy == "P013-coverage-gate"}) == 0
}

test_p013_skips_when_null if {
  result := advanced_gate.violations with input as base_input
  count({v | some v in result; v.policy == "P013-coverage-gate"}) == 0
}

# ---------------------------------------------------------------------------
# P014 — Gitignore integrity
# ---------------------------------------------------------------------------
test_p014_blocks_negation_of_env if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": [".gitignore"],
    "diff_content": {".gitignore": "+!.env"},
  })
  count({v | some v in result; v.policy == "P014-gitignore-integrity"}) > 0
}

# ---------------------------------------------------------------------------
# P015 — Policy immutability for agents
# ---------------------------------------------------------------------------
test_p015_blocks_agent_policy_edit if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["security/policies/commit_gate.rego"],
    "diff_content": {"security/policies/commit_gate.rego": "+# sneaky change"},
    "is_human_verified": false,
  })
  count({v | some v in result; v.policy == "P015-policy-immutable"}) > 0
}

test_p015_allows_human_policy_edit if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["security/policies/commit_gate.rego"],
    "diff_content": {"security/policies/commit_gate.rego": "+# approved change"},
    "is_human_verified": true,
  })
  count({v | some v in result; v.policy == "P015-policy-immutable"}) == 0
}

# ---------------------------------------------------------------------------
# P016 — chmod monitoring
# ---------------------------------------------------------------------------
test_p016_warns_executable_json if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["package.json"],
    "diff_content": {"package.json": "+{}"},
    "file_modes": {"package.json": "100755"},
  })
  count({v | some v in result; v.policy == "P016-chmod-monitor"}) > 0
}

test_p016_allows_executable_script if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["scripts/deploy.sh"],
    "diff_content": {"scripts/deploy.sh": "+echo ok"},
    "file_modes": {"scripts/deploy.sh": "100755"},
  })
  count({v | some v in result; v.policy == "P016-chmod-monitor"}) == 0
}

# ---------------------------------------------------------------------------
# P022 — Large file prevention
# ---------------------------------------------------------------------------
test_p022_blocks_file_over_50mb if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["data/dump.sql"],
    "diff_content": {"data/dump.sql": "+INSERT INTO ..."},
    "file_sizes": {"data/dump.sql": 55000000},
  })
  count({v | some v in result; v.policy == "P022-large-file-block"}) > 0
}

test_p022_warns_file_over_5mb if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["frontend/public/hero.png"],
    "diff_content": {"frontend/public/hero.png": "+binary"},
    "file_sizes": {"frontend/public/hero.png": 8000000},
  })
  count({v | some v in result; v.policy == "P022-large-file-warn"}) > 0
}

test_p022_allows_small_file if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["src/lib.rs"],
    "diff_content": {"src/lib.rs": "+fn main() {}"},
    "file_sizes": {"src/lib.rs": 2048},
  })
  count({v | some v in result; v.policy == "P022-large-file-block"}) == 0
  count({v | some v in result; v.policy == "P022-large-file-warn"}) == 0
}

test_p022_blocks_binary_extension if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["GIS/terrain.tif"],
    "diff_content": {"GIS/terrain.tif": "+binary"},
    "file_sizes": {"GIS/terrain.tif": 1024},
  })
  count({v | some v in result; v.policy == "P022-binary-extension-block"}) > 0
}

test_p022_allows_normal_extension if {
  result := advanced_gate.violations with input as object.union(base_input, {
    "staged_files": ["GIS/route.kml"],
    "diff_content": {"GIS/route.kml": "+<kml>"},
    "file_sizes": {"GIS/route.kml": 50000},
  })
  count({v | some v in result; v.policy == "P022-binary-extension-block"}) == 0
}
