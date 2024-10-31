#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Find git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_ROOT/.git/hooks"

# Copy the prepare-commit-msg hook from the correct location
if [ ! -f "$SCRIPT_DIR/gitguard-prepare.py" ]; then
    echo -e "${RED}❌ Error: Could not find gitguard-prepare.py in $SCRIPT_DIR${NC}"
    exit 1
fi

cp "$SCRIPT_DIR/gitguard-prepare.py" "$GIT_ROOT/.git/hooks/prepare-commit-msg"
chmod +x "$GIT_ROOT/.git/hooks/prepare-commit-msg"

echo -e "${GREEN}✅ GitGuard hook installed successfully!${NC}"
