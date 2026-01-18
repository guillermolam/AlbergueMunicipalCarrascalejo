#!/bin/bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ $# -eq 0 ]; then
	echo "Usage: $0 <environment> [migration_name]"
	echo "Environment must be 'staging' or 'production'"
	exit 1
fi

ENVIRONMENT=$1
MIGRATION_NAME=${2-}

# Validate environment
if [[ $ENVIRONMENT != "staging" && $ENVIRONMENT != "production" ]]; then
	echo -e "${YELLOW}Environment must be either 'staging' or 'production'${NC}"
	exit 1
fi

# Load environment variables based on the environment
if [ -f ".env.${ENVIRONMENT}" ]; then
	echo -e "${YELLOW}Loading ${ENVIRONMENT} environment variables...${NC}"
	export $(grep -v '^#' .env.${ENVIRONMENT} | xargs)
fi

# Check if sqlx is installed
if ! command -v sqlx &>/dev/null; then
	echo -e "${YELLOW}sqlx-cli not found. Installing...${NC}"
	cargo install sqlx-cli --no-default-features --features native-tls,postgres
fi

# Run migrations
echo -e "${YELLOW}Running database migrations for ${ENVIRONMENT}...${NC}"
if [ -z "$MIGRATION_NAME" ]; then
	sqlx migrate run
else
	sqlx migrate run --source migrations/$MIGRATION_NAME
fi

echo -e "${GREEN} Database migrations completed successfully!${NC}"
