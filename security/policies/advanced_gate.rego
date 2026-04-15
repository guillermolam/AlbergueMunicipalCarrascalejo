package advanced_gate

# =============================================================================
# advanced_gate.rego -- Additional OPA policies for agent discipline.
#
# Same input schema as commit_gate.rego plus:
#   "coverage_percent":   72.5  (from test runner; 0 if not available)
#   "branch":             "main" | "feat/xyz" | ...
#   "file_modes":         { "path": "100755", ... }  (octal from `git ls-files -s`)
#   "gitignore_entries":  ["line1", "line2", ...]
# =============================================================================

import rego.v1

# ---------------------------------------------------------------------------
# P010 — No React anywhere
# Catches: react, react-dom, @types/react, jsx runtime, .tsx (React-flavoured)
# Solid.js is the island framework; React is banned.
# ---------------------------------------------------------------------------
react_patterns := [
  "\"react\"",
  "'react'",
  "react-dom",
  "@types/react",
  "from 'react'",
  "from \"react\"",
  "import React",
  "require('react')",
  "require(\"react\")",
  "jsx-runtime",
  "@vitejs/plugin-react",
  "plugin-react",
]

violations contains v if {
  some file in input.staged_files
  diff := input.diff_content[file]
  some pattern in react_patterns
  some line in split(diff, "\n")
  startswith(line, "+")
  contains(line, pattern)
  not contains(file, "policies/")
  v := {
    "policy": "P010-no-react",
    "severity": "error",
    "file": file,
    "msg": sprintf("React is banned. Found '%s'. Use Solid.js for islands.", [pattern]),
  }
}

# ---------------------------------------------------------------------------
# P011 — No UnoCSS Tailwind-compat presets
# Catches any import or usage of the banned presets even outside config files.
# ---------------------------------------------------------------------------
banned_unocss_presets := [
  "@unocss/preset-wind",
  "@unocss/preset-wind3",
  "@unocss/preset-wind4",
  "@unocss/preset-uno",
  "presetWind3",
  "presetWind4",
  "presetWind",
  "presetUno",
  "preset-wind",
  "preset-uno",
]

violations contains v if {
  some file in input.staged_files
  diff := input.diff_content[file]
  some preset in banned_unocss_presets
  some line in split(diff, "\n")
  startswith(line, "+")
  contains(line, preset)
  not contains(file, "policies/")
  v := {
    "policy": "P011-no-tailwind-presets",
    "severity": "error",
    "file": file,
    "msg": sprintf("Banned UnoCSS Tailwind-compat preset '%s'. Use presetMini only.", [preset]),
  }
}

# ---------------------------------------------------------------------------
# P012 — Trunk-Based Development enforcement
# Only main + short-lived feature branches allowed. No long-lived branches,
# no release branches, no develop branch.
# ---------------------------------------------------------------------------
banned_branch_prefixes := [
  "develop",
  "release/",
  "hotfix/",
  "support/",
]

violations contains v if {
  branch := input.branch
  some prefix in banned_branch_prefixes
  startswith(branch, prefix)
  v := {
    "policy": "P012-trunk-based-dev",
    "severity": "error",
    "file": "",
    "msg": sprintf("Branch '%s' violates trunk-based development. Use main + short-lived feature branches only.", [branch]),
  }
}

# Feature branches must follow the pattern: type/short-description
violations contains v if {
  branch := input.branch
  branch != "main"
  not regex.match(`^(feat|fix|chore|refactor|docs|test|ci|perf)/[a-z0-9][a-z0-9-]*$`, branch)
  v := {
    "policy": "P012-branch-naming",
    "severity": "warn",
    "file": "",
    "msg": sprintf("Branch '%s' should follow type/short-description (e.g., feat/add-booking-endpoint).", [branch]),
  }
}

# ---------------------------------------------------------------------------
# P013 — Test coverage gate (95% minimum)
# The hook runner passes coverage_percent from test output.
# ---------------------------------------------------------------------------
min_coverage := 95

violations contains v if {
  input.coverage_percent != null
  input.coverage_percent < min_coverage
  v := {
    "policy": "P013-coverage-gate",
    "severity": "error",
    "file": "",
    "msg": sprintf("Test coverage %.1f%% is below the %d%% minimum. Add tests before committing.", [input.coverage_percent, min_coverage]),
  }
}

# ---------------------------------------------------------------------------
# P014 — .gitignore integrity
# Certain patterns MUST exist in .gitignore; certain patterns MUST NOT.
# ---------------------------------------------------------------------------
required_gitignore := [
  "**/node_modules/",
  ".env",
  "*.pem",
  "**/target/",
]

banned_gitignore := [
  "!.env",
  "!*.pem",
  "!security/policies/",
]

violations contains v if {
  some file in input.staged_files
  file == ".gitignore"
  diff := input.diff_content[file]
  some banned in banned_gitignore
  some line in split(diff, "\n")
  startswith(line, "+")
  contains(line, banned)
  v := {
    "policy": "P014-gitignore-integrity",
    "severity": "error",
    "file": ".gitignore",
    "msg": sprintf("Gitignore negation '%s' would expose protected paths.", [banned]),
  }
}

# Check that required patterns still exist (passed as input.gitignore_entries)
violations contains v if {
  some file in input.staged_files
  file == ".gitignore"
  some required in required_gitignore
  not pattern_in_gitignore(required)
  v := {
    "policy": "P014-gitignore-required",
    "severity": "error",
    "file": ".gitignore",
    "msg": sprintf("Required gitignore pattern '%s' is missing.", [required]),
  }
}

pattern_in_gitignore(pattern) if {
  some entry in input.gitignore_entries
  contains(entry, pattern)
}

# ---------------------------------------------------------------------------
# P015 — security/policies/ is read-only for agents
# Only human commits (verified via GPG signature or explicit override) may
# modify policy files. The hook runner sets input.is_human_verified.
# ---------------------------------------------------------------------------
violations contains v if {
  some file in input.staged_files
  startswith(file, "security/policies/")
  not input.is_human_verified
  v := {
    "policy": "P015-policy-immutable",
    "severity": "error",
    "file": file,
    "msg": "security/policies/ is protected. Only human-verified commits may modify policies.",
  }
}

# ---------------------------------------------------------------------------
# P016 — File permission monitoring
# No executable bits on files that should not be executable.
# Only shell scripts and hook files should be +x.
# ---------------------------------------------------------------------------
allowed_executable_patterns := [
  ".sh",
  "pre-commit",
  "pre-push",
  "commit-msg",
  "post-commit",
  "post-merge",
]

is_allowed_executable(file) if {
  some pattern in allowed_executable_patterns
  endswith(file, pattern)
}

violations contains v if {
  some file, mode in input.file_modes
  # 100755 = executable; 100644 = normal
  mode == "100755"
  not is_allowed_executable(file)
  v := {
    "policy": "P016-chmod-monitor",
    "severity": "warn",
    "file": file,
    "msg": sprintf("File '%s' has executable permission (mode %s) but is not a shell script or hook.", [file, mode]),
  }
}

# ---------------------------------------------------------------------------
# P017 — Config file validation
# Catches agents sneaking changes into critical config files.
# These files must not be modified without explicit human review.
# ---------------------------------------------------------------------------
protected_configs := [
  ".trunk/trunk.yaml",
  "spin.toml",
  ".github/workflows/",
  "infra/",
  "Taskfile.yml",
  "security/",
]

violations contains v if {
  some file in input.staged_files
  some config_path in protected_configs
  startswith(file, config_path)
  not input.is_human_verified
  v := {
    "policy": "P017-protected-config",
    "severity": "warn",
    "file": file,
    "msg": sprintf("Protected config '%s' modified. Ensure human review before merge.", [file]),
  }
}

# ---------------------------------------------------------------------------
# P022 — Large file prevention
# Blocks files that exceed GitHub's 50 MB hard limit and warns on files above
# 5 MB. Catches binaries, unoptimised images, and data dumps BEFORE they
# pollute git history (cleaning them out later requires a force-push).
#
# Input: file_sizes = { "path/to/file": <bytes>, ... }
#        (collected by run-opa-gate.sh for every staged file)
# ---------------------------------------------------------------------------
max_file_bytes_hard  := 50 * 1024 * 1024   # 50 MiB — GitHub rejects above this
max_file_bytes_warn  :=  5 * 1024 * 1024   #  5 MiB — flag for review

# Extensions that are NEVER acceptable in git regardless of size
binary_extensions := [
	".tif", ".tiff", ".laz", ".las", ".ecw",
	".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
	".exe", ".dll", ".so", ".dylib",
	".iso", ".dmg", ".img",
	".mp4", ".avi", ".mov", ".mkv",
	".psd", ".ai",
	".sqlite", ".db",
]

# Hard block: any file > 50 MB
violations contains v if {
	some file, size in input.file_sizes
	size > max_file_bytes_hard
	mb := sprintf("%.1f", [size / (1024 * 1024)])
	v := {
		"policy": "P022-large-file-block",
		"severity": "error",
		"file": file,
		"msg": sprintf("File '%s' is %s MB — exceeds GitHub 50 MB limit. Use Git LFS, compress, or remove.", [file, mb]),
	}
}

# Warn: any file > 5 MB
violations contains v if {
	some file, size in input.file_sizes
	size > max_file_bytes_warn
	size <= max_file_bytes_hard
	mb := sprintf("%.1f", [size / (1024 * 1024)])
	v := {
		"policy": "P022-large-file-warn",
		"severity": "warn",
		"file": file,
		"msg": sprintf("File '%s' is %s MB. Consider optimising, compressing, or moving to LFS.", [file, mb]),
	}
}

# Block binary extensions regardless of size (they bloat history)
violations contains v if {
	some file in input.staged_files
	some ext in binary_extensions
	endswith(lower(file), ext)
	v := {
		"policy": "P022-binary-extension-block",
		"severity": "error",
		"file": file,
		"msg": sprintf("Binary file '%s' (extension %s) must not be committed. Use .gitignore or Git LFS.", [file, ext]),
	}
}

# ---------------------------------------------------------------------------
# Aggregate
# ---------------------------------------------------------------------------
errors := {v | some v in violations; v.severity == "error"}
warnings := {v | some v in violations; v.severity == "warn"}
allow if count(errors) == 0
