package commit_gate

# =============================================================================
# commit_gate.rego -- OPA policy evaluated by the pre-commit hook.
#
# Input schema (produced by the hook runner script):
#   {
#     "staged_files":     ["path/to/file", ...],
#     "diff_content":     { "path/to/file": "<raw unified diff>" },
#     "commit_message":   "the message (empty on pre-commit, set on commit-msg)",
#     "author":           "Name <email>",
#     "branch":           "main"
#   }
#
# Each rule returns a set of violation objects:
#   { "policy": "<name>", "severity": "error|warn", "file": "<path>", "msg": "..." }
# =============================================================================

import rego.v1

# ---------------------------------------------------------------------------
# P001 — No Tailwind CSS
# Catches: @tailwind, tailwindcss, preset-wind, preset-uno, daisyui imports/configs
# ---------------------------------------------------------------------------
tailwind_patterns := [
  "tailwindcss",
  "tailwind.config",
  "@tailwind",
  "preset-wind",
  "presetWind",
  "presetUno",
  "preset-uno",
  "daisyui",
  "daisyUI",
]

violations contains v if {
  some file in input.staged_files
  diff := input.diff_content[file]
  some pattern in tailwind_patterns
  contains(diff, pattern)
  not startswith(file, "security/policies/")
  v := {
    "policy": "P001-no-tailwind",
    "severity": "error",
    "file": file,
    "msg": sprintf("Banned Tailwind/Wind reference '%s' found in diff", [pattern]),
  }
}

# ---------------------------------------------------------------------------
# P002 — No unauthorized root-level directories or scripts
# Only these top-level directories are sanctioned; anything else is a violation.
# ---------------------------------------------------------------------------
allowed_root_dirs := {
  ".claude",
  ".github",
  ".husky",
  ".spacelift",
  ".trae",
  ".trunk",
  ".vscode",
  "GIS",
  "backend",
  "docs",
  "frontend",
  "gateway",
  "infra",
  "security",
  "taskfiles",
  "tests",
}

violations contains v if {
  some file in input.staged_files
  parts := split(file, "/")
  count(parts) > 1
  root := parts[0]
  not root in allowed_root_dirs
  not startswith(root, ".")
  v := {
    "policy": "P002-no-root-sprawl",
    "severity": "error",
    "file": file,
    "msg": sprintf("File in unauthorized root directory '%s'. Allowed: %v", [root, allowed_root_dirs]),
  }
}

# Root-level scripts (outside allowed dirs) are also blocked
violations contains v if {
  some file in input.staged_files
  parts := split(file, "/")
  count(parts) == 1
  endswith(file, ".sh")
  v := {
    "policy": "P002-no-root-scripts",
    "severity": "error",
    "file": file,
    "msg": sprintf("Shell script '%s' at repo root is not allowed. Place in scripts/, .github/scripts/, or taskfiles/.", [file]),
  }
}

# ---------------------------------------------------------------------------
# P003 — No emojis in source files
# Catches common emoji Unicode ranges in diffs of code/markup files.
# Excludes markdown docs and policies themselves.
# ---------------------------------------------------------------------------
code_extensions := {".astro", ".ts", ".tsx", ".js", ".jsx", ".css", ".rs", ".toml", ".yml", ".yaml", ".json"}

is_code_file(file) if {
  some ext in code_extensions
  endswith(file, ext)
}

emoji_ranges := [
  "\\U0001F",  # Most emoji live in U+1Fxxx
]

# Simplified: check for actual common emoji bytes in UTF-8 diffs
# The hook script will grep for emoji codepoints before passing to OPA.
violations contains v if {
  some file in input.staged_files
  is_code_file(file)
  diff := input.diff_content[file]
  input.emoji_detected[file] == true
  v := {
    "policy": "P003-no-emojis",
    "severity": "error",
    "file": file,
    "msg": "Emoji characters detected in source file. Use text labels instead.",
  }
}

# ---------------------------------------------------------------------------
# P004 — Strict colour palette enforcement
# Only #FFFFFF, #000000, #00AB39 and grey scale (#111111-#F5F5F5) allowed.
# Catches hex colours in CSS/Astro/config diffs that violate the palette.
# ---------------------------------------------------------------------------
allowed_hex_prefixes := {
  "#fff", "#FFF", "#ffffff", "#FFFFFF",
  "#000", "#000000",
  "#00ab39", "#00AB39",
  "#111", "#222", "#333", "#444", "#555", "#666", "#777", "#888", "#999",
  "#aaa", "#AAA", "#bbb", "#BBB", "#ccc", "#CCC", "#ddd", "#DDD", "#eee", "#EEE",
  "#f5f5f5", "#F5F5F5", "#e8e8e8", "#E8E8E8",
  "#111111", "#333333", "#666666", "#999999", "#cccccc", "#CCCCCC",
}

# This check is handled by the hook runner (regex extraction + allowlist comparison)
# and passed as input.palette_violations: [{"file": ..., "color": ...}]
violations contains v if {
  some pv in input.palette_violations
  v := {
    "policy": "P004-strict-palette",
    "severity": "warn",
    "file": pv.file,
    "msg": sprintf("Colour '%s' is outside the strict palette (white/green/grey/black).", [pv.color]),
  }
}

# ---------------------------------------------------------------------------
# P005 — Workers services must not import Spin SDK
# ---------------------------------------------------------------------------
workers_services := {
  "backend/booking-service",
  "backend/notification-service",
  "backend/reviews-service",
  "backend/document-validation-service",
  "backend/info-on-arrival-service",
  "backend/location-service",
  "backend/language-service",
}

violations contains v if {
  some file in input.staged_files
  some svc in workers_services
  startswith(file, svc)
  diff := input.diff_content[file]
  contains(diff, "spin-sdk")
  v := {
    "policy": "P005-no-spin-in-workers",
    "severity": "error",
    "file": file,
    "msg": sprintf("Workers service '%s' must not depend on spin-sdk. Use the `worker` crate instead.", [svc]),
  }
}

# ---------------------------------------------------------------------------
# P006 — Spin services must not import the Cloudflare worker crate
# ---------------------------------------------------------------------------
spin_services := {
  "backend/auth-service",
  "backend/rate-limiter-service",
  "backend/redis-service",
  "backend/security-service",
  "gateway/",
}

violations contains v if {
  some file in input.staged_files
  some svc in spin_services
  startswith(file, svc)
  diff := input.diff_content[file]
  contains(diff, "worker =")
  v := {
    "policy": "P006-no-worker-in-spin",
    "severity": "error",
    "file": file,
    "msg": sprintf("Spin service '%s' must not depend on the Cloudflare worker crate. Use spin-sdk.", [svc]),
  }
}

# ---------------------------------------------------------------------------
# P007 — Commit message quality (evaluated on commit-msg hook)
# ---------------------------------------------------------------------------
violations contains v if {
  input.commit_message != ""
  count(input.commit_message) < 10
  v := {
    "policy": "P007-commit-msg-quality",
    "severity": "error",
    "file": "",
    "msg": "Commit message is too short (< 10 chars). Describe what changed and why.",
  }
}

violations contains v if {
  input.commit_message != ""
  not regex.match(`^(feat|fix|refactor|chore|docs|style|test|ci|perf|build|revert)(\(.+\))?[!]?:`, input.commit_message)
  v := {
    "policy": "P007-commit-msg-conventional",
    "severity": "warn",
    "file": "",
    "msg": "Commit message should follow Conventional Commits: type(scope): description",
  }
}

# ---------------------------------------------------------------------------
# P008 — Agent anti-laziness: no placeholder/stub code
# Catches patterns that agents use to cut corners.
# ---------------------------------------------------------------------------
lazy_patterns := [
  "TODO: implement",
  "FIXME: implement",
  "// ...",
  "/* ... */",
  "pass  # placeholder",
  "unimplemented!()",
  "todo!(\"implement",
  "NotImplementedError",
  "raise NotImplemented",
]

violations contains v if {
  some file in input.staged_files
  is_code_file(file)
  diff := input.diff_content[file]
  some pattern in lazy_patterns
  # Only flag in ADDED lines (lines starting with +)
  some line in split(diff, "\n")
  startswith(line, "+")
  contains(line, pattern)
  v := {
    "policy": "P008-no-stubs",
    "severity": "warn",
    "file": file,
    "msg": sprintf("Lazy stub pattern '%s' detected. Implement fully or call a subagent.", [pattern]),
  }
}

# ---------------------------------------------------------------------------
# P009 — No secrets in committed files
# ---------------------------------------------------------------------------
secret_patterns := [
  "PRIVATE_KEY",
  "SECRET_KEY",
  "password =",
  "api_key =",
  "ghp_",
  "gho_",
  "sk-",
  "sk_live_",
  "pk_live_",
]

secret_file_patterns := [
  ".env",
  "credentials",
  ".pem",
  ".key",
]

violations contains v if {
  some file in input.staged_files
  some pattern in secret_file_patterns
  contains(file, pattern)
  v := {
    "policy": "P009-no-secrets-file",
    "severity": "error",
    "file": file,
    "msg": sprintf("Potentially sensitive file '%s' should not be committed.", [file]),
  }
}

violations contains v if {
  some file in input.staged_files
  is_code_file(file)
  diff := input.diff_content[file]
  some pattern in secret_patterns
  some line in split(diff, "\n")
  startswith(line, "+")
  contains(line, pattern)
  not contains(file, "policies/")
  not contains(file, "test")
  v := {
    "policy": "P009-no-secrets-code",
    "severity": "warn",
    "file": file,
    "msg": sprintf("Possible secret pattern '%s' in code. Use environment variables or a vault.", [pattern]),
  }
}

# ---------------------------------------------------------------------------
# Aggregate: errors block the commit, warnings are advisory
# ---------------------------------------------------------------------------
errors := {v | some v in violations; v.severity == "error"}
warnings := {v | some v in violations; v.severity == "warn"}
allow if count(errors) == 0
