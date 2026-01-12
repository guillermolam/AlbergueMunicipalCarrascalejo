#!/bin/bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
SPIN_PROFILE="default"
BUILD_FLAG="--release"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
	case $1 in
	-e | --environment)
		ENVIRONMENT="$2"
		shift # past argument
		shift # past value
		;;
	-p | --profile)
		SPIN_PROFILE="$2"
		shift # past argument
		shift # past value
		;;
	--debug)
		BUILD_FLAG=""
		shift # past argument
		;;
	-h | --help)
		echo "Usage: $0 [options]"
		echo "Options:"
		echo "  -e, --environment  Deployment environment (staging|production). Default: staging"
		echo "  -p, --profile      Spin profile to use. Default: default"
		echo "  --debug            Build in debug mode (faster, larger binary)"
		echo "  -h, --help         Show this help message"
		exit 0
		;;
	*)
		echo "Unknown option: $1"
		exit 1
		;;
	esac
done

# Validate environment
if [[ $ENVIRONMENT != "staging" && $ENVIRONMENT != "production" ]]; then
	echo -e "${RED}Error: Environment must be either 'staging' or 'production'${NC}"
	exit 1
fi

echo -e "${YELLOW} Starting deployment to ${ENVIRONMENT}...${NC}"

# Build the application
echo -e "${YELLOW} Building application...${NC}"
if [ -n "$BUILD_FLAG" ]; then
	spin build $BUILD_FLAG
else
	spin build
fi

# Login to Fermyon Cloud if not already logged in
if ! spin cloud login --check &>/dev/null; then
	echo -e "${YELLOW} Logging in to Fermyon Cloud...${NC}"
	spin cloud login
fi

# Deploy to the appropriate environment
if [ "$ENVIRONMENT" = "production" ]; then
	echo -e "${YELLOW} Deploying to Fermyon Cloud Production...${NC}"
	spin deploy --environment production --profile "$SPIN_PROFILE"

	# Run database migrations for production
	if [ -f "migrate.sh" ]; then
		echo -e "${YELLOW} Running database migrations...${NC}"
		./migrate.sh production
	fi
else
	echo -e "${YELLOW} Deploying to Fermyon Cloud Staging...${NC}"
	spin deploy --environment staging --profile "$SPIN_PROFILE"

	# Run database migrations for staging
	if [ -f "migrate.sh" ]; then
		echo -e "${YELLOW} Running database migrations...${NC}"
		./migrate.sh staging
	fi
fi

echo -e "${GREEN} Deployment to ${ENVIRONMENT} completed successfully!${NC}"

echo -e "\n${YELLOW} Verifying deployment...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
	spin cloud status --environment production
else
	spin cloud status --environment staging
fi

echo -e "\n${GREEN} Your application is live!${NC}"
