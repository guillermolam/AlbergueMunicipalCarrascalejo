#!/bin/bash

# Architecture Validation Script
# Validates that the Taskfile architecture is properly established

set -e

echo "🔍 Validating Taskfile Architecture..."

# Check directory structure
echo "📁 Checking directory structure..."

required_dirs=(
	"taskfiles"
	"scripts"
	"backend/scripts"
	"frontend/scripts"
	"database/scripts"
	"tests/infrastructure/scripts"
	"prompts"
)

for dir in "${required_dirs[@]}"; do
	if [[ -d $dir ]]; then
		echo "  ✅ $dir exists"
	else
		echo "  ❌ $dir missing - creating..."
		mkdir -p "$dir"
	fi
done

# Check key files
echo "📄 Checking key files..."

required_files=(
	"Taskfile.yml"
	"taskfiles/Taskfile.clean.yml"
	"taskfiles/Taskfile.dev.yml"
	"taskfiles/Taskfile.ports.yml"
	"scripts/port-manager.py"
	"backend/scripts/start-all-services.sh"
	"backend/scripts/stop-all-services.sh"
	"prompts/TASKFILE_ARCHITECTURE.md"
)

for file in "${required_files[@]}"; do
	if [[ -f $file ]]; then
		echo "  ✅ $file exists"
	else
		echo "  ❌ $file missing"
	fi
done

# Check script permissions
echo "🔐 Checking script permissions..."

scripts_to_check=(
	"scripts/*.sh"
	"backend/scripts/*.sh"
	"frontend/scripts/*.sh"
	"database/scripts/*.sh"
	"tests/infrastructure/scripts/*.sh"
)

for pattern in "${scripts_to_check[@]}"; do
	for script in $pattern; do
		if [[ -f $script ]] && [[ ! -x $script ]]; then
			echo "  ⚠️  $script not executable - fixing..."
			chmod +x "$script"
		elif [[ -f $script ]]; then
			echo "  ✅ $script is executable"
		fi
	done
done

echo "🎉 Architecture validation complete!"
