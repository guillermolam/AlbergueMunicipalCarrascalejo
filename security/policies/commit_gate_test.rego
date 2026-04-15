package commit_gate_test

import rego.v1
import data.commit_gate

# ---------------------------------------------------------------------------
# P001 — Tailwind detection
# ---------------------------------------------------------------------------
test_p001_blocks_tailwind_import if {
  result := commit_gate.violations with input as {
    "staged_files": ["frontend/src/pages/index.astro"],
    "diff_content": {"frontend/src/pages/index.astro": "+import 'tailwindcss/base';"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P001-no-tailwind"}) > 0
}

test_p001_blocks_preset_wind if {
  result := commit_gate.violations with input as {
    "staged_files": ["frontend/uno.config.ts"],
    "diff_content": {"frontend/uno.config.ts": "+import { presetWind } from 'unocss';"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P001-no-tailwind"}) > 0
}

test_p001_allows_clean_unocss if {
  result := commit_gate.violations with input as {
    "staged_files": ["frontend/uno.config.ts"],
    "diff_content": {"frontend/uno.config.ts": "+import { presetMini } from 'unocss';"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P001-no-tailwind"}) == 0
}

# ---------------------------------------------------------------------------
# P002 — Root sprawl detection
# ---------------------------------------------------------------------------
test_p002_blocks_unauthorized_root_dir if {
  result := commit_gate.violations with input as {
    "staged_files": ["random_dir/script.sh"],
    "diff_content": {"random_dir/script.sh": "+echo hello"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P002-no-root-sprawl"}) > 0
}

test_p002_allows_sanctioned_dirs if {
  result := commit_gate.violations with input as {
    "staged_files": ["backend/booking-service/src/lib.rs"],
    "diff_content": {"backend/booking-service/src/lib.rs": "+fn main() {}"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P002-no-root-sprawl"}) == 0
}

test_p002_blocks_root_script if {
  result := commit_gate.violations with input as {
    "staged_files": ["deploy.sh"],
    "diff_content": {"deploy.sh": "+#!/bin/bash"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P002-no-root-scripts"}) > 0
}

# ---------------------------------------------------------------------------
# P005 — No spin-sdk in Workers services
# ---------------------------------------------------------------------------
test_p005_blocks_spin_in_workers if {
  result := commit_gate.violations with input as {
    "staged_files": ["backend/booking-service/Cargo.toml"],
    "diff_content": {"backend/booking-service/Cargo.toml": "+spin-sdk = \"5.0\""},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P005-no-spin-in-workers"}) > 0
}

# ---------------------------------------------------------------------------
# P006 — No worker crate in Spin services
# ---------------------------------------------------------------------------
test_p006_blocks_worker_in_spin if {
  result := commit_gate.violations with input as {
    "staged_files": ["gateway/api-gateway/Cargo.toml"],
    "diff_content": {"gateway/api-gateway/Cargo.toml": "+worker = \"0.7.5\""},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P006-no-worker-in-spin"}) > 0
}

# ---------------------------------------------------------------------------
# P007 — Commit message quality
# ---------------------------------------------------------------------------
test_p007_blocks_short_message if {
  result := commit_gate.violations with input as {
    "staged_files": [],
    "diff_content": {},
    "commit_message": "fix",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P007-commit-msg-quality"}) > 0
}

test_p007_warns_non_conventional if {
  result := commit_gate.violations with input as {
    "staged_files": [],
    "diff_content": {},
    "commit_message": "updated some stuff in the backend to work better",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P007-commit-msg-conventional"}) > 0
}

test_p007_allows_conventional if {
  result := commit_gate.violations with input as {
    "staged_files": [],
    "diff_content": {},
    "commit_message": "feat(booking): add cancellation endpoint with 24h policy",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P007-commit-msg-conventional"}) == 0
}

# ---------------------------------------------------------------------------
# P008 — Agent laziness
# ---------------------------------------------------------------------------
test_p008_catches_todo_implement if {
  result := commit_gate.violations with input as {
    "staged_files": ["backend/booking-service/src/lib.rs"],
    "diff_content": {"backend/booking-service/src/lib.rs": "+// TODO: implement\n+fn cancel_booking() {}"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P008-no-stubs"}) > 0
}

# ---------------------------------------------------------------------------
# P009 — No secrets
# ---------------------------------------------------------------------------
test_p009_blocks_env_file if {
  result := commit_gate.violations with input as {
    "staged_files": [".env"],
    "diff_content": {".env": "+SECRET=abc"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
  count({v | some v in result; v.policy == "P009-no-secrets-file"}) > 0
}

# ---------------------------------------------------------------------------
# allow / deny aggregate
# ---------------------------------------------------------------------------
test_allow_when_clean if {
  commit_gate.allow with input as {
    "staged_files": ["frontend/src/pages/index.astro"],
    "diff_content": {"frontend/src/pages/index.astro": "+<h1>Bienvenidos</h1>"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
}

test_deny_when_tailwind if {
  not commit_gate.allow with input as {
    "staged_files": ["frontend/tailwind.config.mjs"],
    "diff_content": {"frontend/tailwind.config.mjs": "+module.exports = { content: ['tailwindcss'] }"},
    "commit_message": "",
    "author": "test",
    "branch": "main",
    "emoji_detected": {},
    "palette_violations": [],
  }
}
