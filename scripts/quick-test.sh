#!/bin/bash
# Quick validation and test

cd /home/glam/git/personal/AlbergueMunicipalCarrascalejo

echo "1. Cleaning Taskfile..."
LC_ALL=C sed 's/[^\x00-\x7F]//g' Taskfile.yml >Taskfile.tmp
mv Taskfile.tmp Taskfile.yml

echo "2. Testing YAML syntax..."
python3 -c "import yaml; yaml.safe_load(open('Taskfile.yml'))" && echo "YAML OK" || echo "YAML FAILED"

echo "3. Testing task command..."
task --version && echo "Task OK" || echo "Task not found"

echo "4. Listing tasks..."
task --list 2>&1 | head -20

echo "Done!"
