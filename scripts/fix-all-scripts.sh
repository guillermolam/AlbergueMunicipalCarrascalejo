#!/bin/bash
# Fix all scripts by removing emojis and ensuring proper error handling

set -e

echo "Fixing all shell scripts..."

# Function to strip emojis and ensure set -e
fix_script() {
	local file="$1"
	if [ ! -f "$file" ]; then
		return
	fi

	echo "Fixing $file..."

	# Create backup
	cp "$file" "$file.bak"

	# Remove emojis and control characters, keep newlines and tabs
	LC_ALL=C sed -i 's/[^\x00-\x7F]//g' "$file" || {
		echo "ERROR: Failed to fix $file"
		mv "$file.bak" "$file"
		return 1
	}

	# Ensure shebang exists
	if ! head -1 "$file" | grep -q "^#!/bin/"; then
		echo "#!/bin/bash" | cat - "$file" >"$file.tmp"
		mv "$file.tmp" "$file"
	fi

	# Ensure set -e or set -euo pipefail exists after shebang
	if ! head -10 "$file" | grep -q "set -e"; then
		sed -i '2i set -e' "$file"
	fi

	chmod +x "$file"
	rm "$file.bak"
}

# Fix all scripts in main scripts directory
for script in scripts/*.sh; do
	fix_script "$script"
done

# Fix scripts in subdirectories
for script in domain_model/scripts/*.sh frontend/scripts/*.sh; do
	if [ -f "$script" ]; then
		fix_script "$script"
	fi
done

echo "All scripts fixed!"
echo "Run: git diff scripts/ to see changes"
