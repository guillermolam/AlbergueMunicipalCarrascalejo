#!/bin/bash

# List of packages to process
PACKAGES=(
  "admin"
  "auth"
  "registration-form"
  "reviews"
  "ui"
)

# Move components up one level and remove empty directories
for pkg in "${PACKAGES[@]}"; do
  echo "Processing package: $pkg"
  # Move all files from components/ to src/
  mv "/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages/components/$pkg/src/components/"* "/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages/components/$pkg/src/"
  # Remove empty components directory
  rmdir "/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages/components/$pkg/src/components"
done

# Remove empty src/components directory
rmdir "/home/glam/git/AlbergueMunicipalCarrascalejo/frontend/packages/components/src/components"
