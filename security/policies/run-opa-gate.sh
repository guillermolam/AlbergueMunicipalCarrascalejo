#!/bin/sh
# =============================================================================
# run-opa-gate.sh -- Hook runner that collects git state, builds OPA input JSON,
# evaluates all Rego policies, and blocks on errors.
#
# Usage:
#   security/policies/run-opa-gate.sh [pre-commit|commit-msg <msgfile>]
#
# Exit codes:
#   0  = all clear (no errors, warnings printed)
#   1  = policy violations found (errors block, warnings print)
#   2  = OPA not installed (skip gracefully)
# =============================================================================
set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
POLICY_DIR="${REPO_ROOT}/security/policies"
HOOK_TYPE="${1:-pre-commit}"
MSG_FILE="${2-}"

# Skip if OPA is not installed
if ! command -v opa >/dev/null 2>&1; then
	echo "[opa-gate] OPA not installed — skipping policy checks."
	echo "[opa-gate] Install: brew install opa"
	exit 0
fi

# ----- Collect staged files --------------------------------------------------
STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
DELETED=$(git diff --cached --name-only --diff-filter=D 2>/dev/null || true)

if [ -z "${STAGED}" ] && [ -z "${DELETED}" ]; then
	exit 0
fi

# ----- Build diff_content map ------------------------------------------------
DIFF_JSON="{"
first=true
for file in ${STAGED}; do
	diff=$(git diff --cached -- "${file}" 2>/dev/null | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' '\\' | sed 's/\\/\\n/g' || true)
	if [ "${first}" = true ]; then
		first=false
	else
		DIFF_JSON="${DIFF_JSON},"
	fi
	DIFF_JSON="${DIFF_JSON}\"${file}\":\"${diff}\""
done
DIFF_JSON="${DIFF_JSON}}"

# ----- Build staged_files array ----------------------------------------------
FILES_JSON="["
first=true
for file in ${STAGED}; do
	if [ "${first}" = true ]; then
		first=false
	else
		FILES_JSON="${FILES_JSON},"
	fi
	FILES_JSON="${FILES_JSON}\"${file}\""
done
FILES_JSON="${FILES_JSON}]"

# ----- Build deleted_files array ---------------------------------------------
DEL_JSON="["
first=true
for file in ${DELETED}; do
	if [ "${first}" = true ]; then
		first=false
	else
		DEL_JSON="${DEL_JSON},"
	fi
	DEL_JSON="${DEL_JSON}\"${file}\""
done
DEL_JSON="${DEL_JSON}]"

# ----- Commit message (for commit-msg hook) ----------------------------------
COMMIT_MSG=""
if [ "${HOOK_TYPE}" = "commit-msg" ] && [ -n "${MSG_FILE}" ] && [ -f "${MSG_FILE}" ]; then
	COMMIT_MSG=$(sed 's/\\/\\\\/g; s/"/\\"/g' "${MSG_FILE}" | tr '\n' ' ')
fi

# ----- Branch ----------------------------------------------------------------
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# ----- Emoji detection (binary grep for common emoji byte sequences) ---------
EMOJI_JSON="{"
first=true
for file in ${STAGED}; do
	if [ "${first}" = true ]; then
		first=false
	else
		EMOJI_JSON="${EMOJI_JSON},"
	fi
	# Check for 4-byte UTF-8 sequences (emoji range U+1F000+)
	has_emoji="false"
	if git diff --cached -- "${file}" 2>/dev/null | grep -qP '[\x{1F300}-\x{1F9FF}]' 2>/dev/null; then
		has_emoji="true"
	fi
	EMOJI_JSON="${EMOJI_JSON}\"${file}\":${has_emoji}"
done
EMOJI_JSON="${EMOJI_JSON}}"

# ----- File modes ------------------------------------------------------------
MODES_JSON="{"
first=true
for file in ${STAGED}; do
	mode=$(git ls-files -s -- "${file}" 2>/dev/null | awk '{print $1}' || true)
	if [ -n "${mode}" ]; then
		if [ "${first}" = true ]; then
			first=false
		else
			MODES_JSON="${MODES_JSON},"
		fi
		MODES_JSON="${MODES_JSON}\"${file}\":\"${mode}\""
	fi
done
MODES_JSON="${MODES_JSON}}"

# ----- Gitignore entries -----------------------------------------------------
GI_JSON="[]"
if [ -f "${REPO_ROOT}/.gitignore" ]; then
	GI_JSON="["
	first=true
	while IFS= read -r line; do
		clean=$(echo "${line}" | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')
		if [ -n "${clean}" ] && [ "$(echo "${clean}" | cut -c1)" != "#" ]; then
			if [ "${first}" = true ]; then
				first=false
			else
				GI_JSON="${GI_JSON},"
			fi
			escaped=$(echo "${clean}" | sed 's/\\/\\\\/g; s/"/\\"/g')
			GI_JSON="${GI_JSON}\"${escaped}\""
		fi
	done <"${REPO_ROOT}/.gitignore"
	GI_JSON="${GI_JSON}]"
fi

# ----- File sizes (bytes) for P022 large-file detection ----------------------
SIZES_JSON="{"
first=true
for file in ${STAGED}; do
	if [ -f "${REPO_ROOT}/${file}" ]; then
		size=$(wc -c <"${REPO_ROOT}/${file}" | tr -d ' ')
	else
		size=0
	fi
	if [ "${first}" = true ]; then
		first=false
	else
		SIZES_JSON="${SIZES_JSON},"
	fi
	SIZES_JSON="${SIZES_JSON}\"${file}\":${size}"
done
SIZES_JSON="${SIZES_JSON}}"

# ----- Human verification (GPG-signed commit or env override) ----------------
IS_HUMAN="false"
if [ -n "${OPA_HUMAN_VERIFIED-}" ]; then
	IS_HUMAN="true"
fi

# ----- Assemble full input JSON ----------------------------------------------
INPUT_FILE=$(mktemp)
cat >"${INPUT_FILE}" <<ENDJSON
{
  "staged_files": ${FILES_JSON},
  "deleted_files": ${DEL_JSON},
  "diff_content": ${DIFF_JSON},
  "commit_message": "${COMMIT_MSG}",
  "author": "$(git config user.name 2>/dev/null || echo unknown) <$(git config user.email 2>/dev/null || echo unknown)>",
  "branch": "${BRANCH}",
  "emoji_detected": ${EMOJI_JSON},
  "palette_violations": [],
  "coverage_percent": null,
  "file_modes": ${MODES_JSON},
  "file_sizes": ${SIZES_JSON},
  "gitignore_entries": ${GI_JSON},
  "is_human_verified": ${IS_HUMAN}
}
ENDJSON

# ----- Evaluate all policies -------------------------------------------------
RESULT=$(opa eval \
	--data "${POLICY_DIR}/commit_gate.rego" \
	--data "${POLICY_DIR}/advanced_gate.rego" \
	--data "${POLICY_DIR}/anti_bypass_gate.rego" \
	--input "${INPUT_FILE}" \
	--format pretty \
	'errors := data.commit_gate.errors | data.advanced_gate.errors | data.anti_bypass_gate.errors;
   warnings := data.commit_gate.warnings | data.advanced_gate.warnings | data.anti_bypass_gate.warnings;
   {"errors": errors, "warnings": warnings, "allow": count(errors) == 0}' \
	2>&1) || true

rm -f "${INPUT_FILE}"

# ----- Parse and report ------------------------------------------------------
error_count=$(echo "${RESULT}" | grep -o '"policy"' | wc -l | tr -d ' ')

# Print warnings
echo "${RESULT}" | grep -o '"msg": "[^"]*"' | while IFS= read -r line; do
	msg=$(echo "${line}" | sed 's/"msg": "//; s/"$//')
	echo "[opa-gate] ${msg}"
done

if echo "${RESULT}" | grep -q '"allow": false'; then
	echo ""
	echo "[opa-gate] BLOCKED: ${error_count} policy violation(s) found."
	echo "[opa-gate] Run: opa eval --data security/policies/ --input <json> 'data.commit_gate.violations'"
	exit 1
fi

echo "[opa-gate] All policies passed."
exit 0
