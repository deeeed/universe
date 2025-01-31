#!/bin/bash
set -e

# Define color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get absolute path of script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"  # This puts us in the design-system directory
echo -e "${BLUE}Changed to package directory: $(pwd)${NC}"

# Check for uncommitted changes
if [[ $(git status --porcelain) ]]; then
    echo -e "${RED}There are uncommitted changes:${NC}"
    git status --porcelain
    read -p "$(echo -e ${YELLOW}Do you want to continue anyway? [y/N]: ${NC})" continue_with_changes
    if [[ $continue_with_changes =~ ^[Yy]$ ]]; then
        PUBLISHER_ARGS="--no-git-check"
        echo -e "${YELLOW}Proceeding with --no-git-check${NC}"
    else
        echo -e "${BLUE}Aborting. Please commit or stash your changes first.${NC}"
        exit 1
    fi
fi

# Cleanup and rebuild first
echo -e "${YELLOW}Cleaning and rebuilding...${NC}"
yarn clean
yarn typecheck
yarn build

# Run publisher release
echo -e "${YELLOW}Starting publication process...${NC}"
publisher release ${PUBLISHER_ARGS:-}

# Get version after release
version=$(node -p "require('./package.json').version")
echo -e "${GREEN}Published version: $version${NC}"

# Ask about deploying storybook
read -p "$(echo -e ${YELLOW}Do you want to deploy the storybook? [Y/n]: ${NC})" deploy_storybook
if [[ ! $deploy_storybook =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}Building and deploying storybook...${NC}"
    yarn deploy:storybook
fi

echo -e "${GREEN}Publication process completed successfully!${NC}"
