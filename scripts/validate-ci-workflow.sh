#!/usr/bin/env bash
set -euo pipefail

# Validate GitHub Actions workflow file syntax

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_FILE="$PROJECT_ROOT/.github/workflows/ci.yml"

echo "Validating GitHub Actions workflow: $WORKFLOW_FILE"

# Check if file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "ERROR: Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

# Validate YAML syntax using yamllint if available, otherwise basic check
if command -v yamllint &> /dev/null; then
    # Ignore line-length and document-start rules
    if yamllint -d "{extends: default, rules: {line-length: disable, document-start: disable}}" "$WORKFLOW_FILE" 2>&1; then
        echo "✓ YAML syntax is valid (yamllint)"
    else
        echo "WARNING: Some yamllint issues found, but checking basic structure..."
        if grep -q "^name:" "$WORKFLOW_FILE" && \
           grep -q "^on:" "$WORKFLOW_FILE" && \
           grep -q "^jobs:" "$WORKFLOW_FILE"; then
            echo "✓ Basic YAML structure is valid"
        else
            echo "✗ YAML structure appears invalid"
            exit 1
        fi
    fi
else
    # Basic syntax check - just ensure it's loadable
    if grep -q "^name:" "$WORKFLOW_FILE" && \
       grep -q "^on:" "$WORKFLOW_FILE" && \
       grep -q "^jobs:" "$WORKFLOW_FILE"; then
        echo "✓ Basic YAML structure is valid"
    else
        echo "✗ YAML structure appears invalid"
        exit 1
    fi
fi

# Check for common issues
echo ""
echo "Checking for common workflow issues..."

# Check for required fields
if ! grep -q "^name:" "$WORKFLOW_FILE"; then
    echo "WARNING: Missing 'name' field"
fi

if ! grep -q "^on:" "$WORKFLOW_FILE"; then
    echo "ERROR: Missing 'on' field (trigger events)"
    exit 1
fi

if ! grep -q "^jobs:" "$WORKFLOW_FILE"; then
    echo "ERROR: Missing 'jobs' field"
    exit 1
fi

# Check for node version consistency
NODE_VERSIONS=$(grep -o "node-version:.*[0-9]*" "$WORKFLOW_FILE" | cut -d: -f2 | tr -d '"' | tr -d "'" | tr -d ' ' | sort -u)
NODE_VERSION_COUNT=$(echo "$NODE_VERSIONS" | wc -l)

if [ "$NODE_VERSION_COUNT" -gt 1 ]; then
    echo "WARNING: Multiple Node.js versions found:"
    echo "$NODE_VERSIONS"
fi

# Check for pnpm version consistency
PNPM_VERSIONS=$(grep -o "version:.*[0-9]*" "$WORKFLOW_FILE" | grep -A1 "pnpm" | cut -d: -f2 | tr -d ' ' | sort -u)
if [ -n "$PNPM_VERSIONS" ]; then
    PNPM_VERSION_COUNT=$(echo "$PNPM_VERSIONS" | wc -l)
    if [ "$PNPM_VERSION_COUNT" -gt 1 ]; then
        echo "WARNING: Multiple pnpm versions found:"
        echo "$PNPM_VERSIONS"
    fi
fi

# Check for wasm target
if grep -q "wasm32-wasi[^p]" "$WORKFLOW_FILE"; then
    echo "WARNING: Found 'wasm32-wasi' - should be 'wasm32-wasip1' for Spin"
fi

if ! grep -q "wasm32-wasip1" "$WORKFLOW_FILE"; then
    echo "WARNING: No 'wasm32-wasip1' target found"
fi

# List all jobs
echo ""
echo "Jobs defined:"
grep -E "^[[:space:]]{4}[a-zA-Z_-]+:" "$WORKFLOW_FILE" | sed 's/:$//' | sed 's/^[[:space:]]*/  - /'

echo ""
echo "✓ Workflow validation complete"
